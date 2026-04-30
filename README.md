# 🌿 PlantNFC – Android App

A fully native Android application rebuilt from the **NfcGenerator & Reader** web app.  
It manages NFC tags attached to garden plants, stores plant data from Google Sheets, and syncs records to Google Drive.

---

## 📱 Feature Map  (Web → Android)

| Web feature | Android equivalent |
|---|---|
| Generator tab | `GeneratorScreen` – plant picker, data fields, NFC preview |
| Reader tab | `ReaderScreen` – NFC foreground dispatch, decoded view |
| Collapsible panels | `ExpandableCard` composable with animated chevron |
| Toggle switches (GPS, Notes) | Material 3 `Switch` inside card header |
| Searchable select dropdowns | `ExposedDropdownMenuBox` with live filter |
| GPS `packBase64` / `unpackBase64` | `GpsPacketCodec` (Kotlin, identical math) |
| Slash-delimited NFC text codec | `NfcTextCodec` (encode / decode / size) |
| Google Sheets gviz/tq fetch | `GoogleSheetsDataSource` coroutine |
| Google Apps Script sheet writer | `GoogleDriveDataSource` (REST Drive API) |
| `localStorage` for last NFC ID | Room DB + `NfcRecordDao.maxNfcId()` |
| EN / HU language toggle | DataStore preference + string resources |
| NFCListPage | `NfcListScreen` with search + sync indicators |
| QR code popup | ZXing core (BarcodeEncoder) – add in GeneratorScreen |
| NFC Web API (`NDEFReader`) | Android `NfcAdapter` reader mode |

---

## 🏗 Architecture

```
app/
├── data/
│   ├── local/
│   │   ├── PlantNfcDatabase.kt      Room database
│   │   ├── AppPreferences.kt        DataStore (language, URLs)
│   │   ├── dao/Daos.kt              PlantDao + NfcRecordDao
│   │   └── entities/Entities.kt     Room entities
│   ├── remote/api/
│   │   ├── GoogleSheetsDataSource.kt  gviz/tq plant fetch
│   │   └── GoogleDriveDataSource.kt   Drive REST NFC sync
│   ├── repository/
│   │   └── Repositories.kt          PlantRepositoryImpl + NfcRecordRepositoryImpl
│   └── sync/
│       └── SyncWorker.kt            WorkManager periodic sync
├── di/
│   └── Modules.kt                   Hilt bindings
├── domain/
│   ├── model/Models.kt              Plant, NfcRecord, GpsData, NfcType, SyncStatus
│   └── repository/Repositories.kt  Pure interfaces
├── presentation/
│   ├── theme/                       Material 3 colours, typography, shapes
│   ├── common/CommonComponents.kt   ExpandableCard, MonoBox, GpsTracker, NfcWriteButton
│   ├── generator/                   GeneratorScreen + GeneratorViewModel
│   ├── reader/                      ReaderScreen + ReaderViewModel
│   ├── nfclist/                     NfcListScreen + NfcListViewModel
│   ├── settings/                    SettingsScreen + SettingsViewModel
│   └── MainActivity.kt              NFC dispatch, Navigation, Hilt entry point
└── util/
    └── NfcCodec.kt                  GpsPacketCodec + NfcTextCodec + LinkBuilder
```

### Data flow

```
Google Sheets ──► GoogleSheetsDataSource ──► PlantRepositoryImpl ──► Room (plants)
                                                                          │
                                                                     GeneratorViewModel
                                                                          │
                                                                    User fills form
                                                                          │
                                                                    NfcTextCodec.encode()
                                                                          │
                                                              ┌───────────┴───────────┐
                                                         NFC write              Room insert
                                                         (physical tag)     (nfc_records, PENDING)
                                                                                      │
                                                                               SyncWorker
                                                                                      │
                                                                         GoogleDriveDataSource
                                                                        (plantnfc_records.json)
```

### Local-first / offline strategy

1. Plants are cached in Room after first successful Sheets fetch.  
2. NFC records are written to Room immediately with `SyncStatus.PENDING`.  
3. `SyncWorker` (runs every 6 hours when Wi-Fi/mobile is available) pushes PENDING records and marks them `SYNCED`.  
4. Pull from Drive merges remote records (last-write-wins by ID).  
5. The app is fully functional with no network connection.

---

## ⚙️ Setup

### 1. Google Cloud Project

1. Open [console.cloud.google.com](https://console.cloud.google.com).
2. Create a new project (e.g. **PlantNFC**).
3. Enable the **Google Drive API**:  
   APIs & Services → Enable APIs → search "Google Drive API" → Enable.
4. Enable the **Google Sheets API** (for the gviz/tq public endpoint — no key needed if sheet is public).

### 2. OAuth 2.0 credentials

1. APIs & Services → Credentials → Create Credentials → OAuth client ID.
2. Application type: **Android**.
3. Package name: `com.plantnfc` (or your custom package).
4. SHA-1 fingerprint: run  
   ```bash
   ./gradlew signingReport
   # or
   keytool -keystore ~/.android/debug.keystore -list -v -alias androiddebugkey -storepass android
   ```
5. No client secret is needed for Android OAuth — the credential is embedded via the SHA-1 hash.

### 3. Configure the app

Edit **`GoogleSheetsDataSource.kt`**:
```kotlin
const val SHEET_ID   = "YOUR_GOOGLE_SHEET_ID_HERE"
const val SHEET_NAME = "plant_list"
```

Edit **`LinkBuilder.kt`** in `NfcCodec.kt`:
```kotlin
private const val BASE_URL = "https://your-domain.com/W/P.html"
```

Or configure at runtime via the Settings screen (persisted in DataStore).

### 4. Google Sheet requirements

Your sheet must have these columns (adjust column letters in `TQ_ACTIVE_NFC` if different):

| Column | Header | Notes |
|---|---|---|
| A | `Plant_ID` | Unique plant identifier |
| B | `LatinName` | e.g. *Malus domestica* |
| C | `Name_Variety` | e.g. *Species*, *Golden Delicious* |
| D | `Name_HU` | Hungarian name |
| E | `Name_EN` | English name |
| CR | `Active_in_NFC` | `Y` = included |

To make the sheet publicly readable (no API key needed):  
Share → Anyone with the link → Viewer.

### 5. Google Drive sync

Drive sync uses the user's own Google account (OAuth Drive scope `drive.file`).  
Records are saved as `PlantNFC Data/plantnfc_records.json` in the user's Drive.

The user signs in via **Settings → Sign in with Google**.

### 6. Build & run

```bash
# Clone / open in Android Studio Ladybug (2024.2+) or newer
# Sync Gradle
./gradlew assembleDebug
# Install
adb install app/build/outputs/apk/debug/app-debug.apk
```

Minimum SDK: **26 (Android 8.0)** — required for NFC NDEF reader mode API.  
Target SDK: **35 (Android 15)**.

---

## 🔑 NFC Data Format

The text record stored on each physical NFC tag uses a slash-delimited format:

```
{nfcId}/{plantId}/{plantName}/{variety}/{latinName}/{nfcType}/{datum}[/{gpsPacket}][/{other}]/
```

**Example:**
```
5/1/Alma/Species/Malus domestica/n/2026-04-09/L|BV1KgAq6lQAD6A==|L/
```

### GPS packet encoding

The GPS packet `L|<base64>|L` wraps 12 bytes (big-endian):

| Bytes | Type | Value |
|---|---|---|
| 0–3 | UInt32 | `(lat + 90) * 1_000_000` |
| 4–7 | UInt32 | `(lon + 180) * 1_000_000` |
| 8–9 | UInt16 | `alt + 1000` |
| 10–11 | UInt16 | `acc + 1000` |

Implemented in `GpsPacketCodec` — identical math to the web's `packBase64`/`unpackBase64`.

### NFC type codes

| Code | Meaning |
|---|---|
| `n` | Normal plant |
| `o` | Graft |
| `m` | Seed |

---

## 🔒 Security

- OAuth tokens are managed by Google Play Services (`GoogleSignIn`) — never stored manually.
- DataStore preferences use the default Android keystore-backed encryption on API 23+.
- The Drive file scope (`drive.file`) limits access to only files created by this app.
- The Google Sheet is accessed via its public gviz endpoint (no API key in the APK).

---

## 🔔 Background sync

WorkManager `SyncWorker` runs every 6 hours on any network, with exponential backoff on failure.  
A one-shot sync is triggered immediately after Google sign-in and can be triggered manually from Settings.

---

## 🧪 QR Code

The web app opens a QR code via a new browser tab.  
To implement in Android, add to `GeneratorScreen` (ZXing core is already in `build.gradle.kts`):

```kotlin
// In ActionsContent:
OutlinedButton(onClick = {
    val barcodeEncoder = com.google.zxing.BarcodeEncoder()
    val bitmap = barcodeEncoder.encodeBitmap(uiState.nfcLink, com.google.zxing.BarcodeFormat.QR_CODE, 512, 512)
    // display bitmap in a Dialog
}) { Text("QR Code") }
```

---

## 📦 Dependencies summary

| Library | Purpose |
|---|---|
| Jetpack Compose + Material 3 | UI |
| Hilt | Dependency injection |
| Room | Local SQLite database |
| DataStore Preferences | Settings persistence |
| Navigation Compose | Screen routing |
| Kotlin Coroutines + Flow | Async / reactive |
| WorkManager | Background sync scheduling |
| Google Sign-In | OAuth authentication |
| Google Drive API (Java client) | Drive REST calls |
| ZXing Core | QR code generation |
| Retrofit + Moshi | (reserved for future REST endpoints) |
| Coil | Image loading |
| AndroidX Security Crypto | Encrypted DataStore (optional upgrade) |

---

## 🗺 Roadmap / Bonus features

- [ ] **Selective sync** – choose which plant families to include in Drive backup  
- [ ] **Export/Import** – export local DB as JSON, import from file picker  
- [ ] **Multi-account** – switch between Google accounts in Settings  
- [ ] **Map view** – show GPS-tagged plants on Google Maps  
- [ ] **Plant detail screen** – in-app WebView of `P.html?id=X` as a fallback  
- [ ] **Hungarian localisation** – full `strings-hu.xml` using the TRANSLATIONS map  
- [ ] **FCM push** – receive sync notifications when records are added on other devices  
