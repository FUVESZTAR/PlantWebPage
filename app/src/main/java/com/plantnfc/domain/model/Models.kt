package com.plantnfc.domain.model

/**
 * Core plant domain model.
 * Maps from Google Sheets columns: Plant_ID, LatinName, Name_Variety, Name_HU, Name_EN, Active_in_NFC
 */
data class Plant(
    val plantId: String,
    val latinName: String,
    val nameVariety: String,
    val nameHu: String,
    val nameEn: String,
    val activeInNfc: Boolean = true,
    val activeInPage: Boolean = true,
)

enum class NfcType(val code: String, val labelEn: String, val labelHu: String) {
    PLANT("n", "n – plant", "n – növény"),
    GRAFT("o", "o – graft", "o – oltás"),
    SEED("m", "m – seed", "m – mag");

    companion object {
        fun fromCode(code: String) = entries.firstOrNull { it.code == code } ?: PLANT
    }
}

/**
 * GPS data stored in a compact Base64 packet inside the NFC text record.
 * Format: L|<base64>|L
 * Binary layout (12 bytes):
 *   [0..3]  UInt32  lat = (lat + 90)  * 1_000_000
 *   [4..7]  UInt32  lon = (lon + 180) * 1_000_000
 *   [8..9]  UInt16  alt = alt + 1000
 *   [10..11] UInt16 acc = acc + 1000
 */
data class GpsData(
    val latitude: Double,
    val longitude: Double,
    val altitudeM: Int,
    val accuracyM: Int,
)

/**
 * Full NFC record – matches the slash-delimited text format:
 *   nfcId/plantId/name/variety/latinName/nfcType/datum[/gpsPacket][/other]/
 */
data class NfcRecord(
    val id: Long = 0,
    val nfcId: Int,
    val plantId: String,
    val plantName: String,
    val variety: String,
    val latinName: String,
    val nfcType: NfcType,
    val datum: String,               // YYYY-MM-DD
    val gpsPacket: String? = null,   // raw "L|<b64>|L" or null
    val other: String? = null,
    val serialNumber: String? = null, // hardware UID of the physical tag
    val link: String? = null,
    val createdAt: String? = null,
    val syncStatus: SyncStatus = SyncStatus.PENDING,
)

enum class SyncStatus { PENDING, SYNCED, CONFLICT }

/** Parsed keys from the slash-delimited NFC text. */
val NFC_TEXT_KEYS = listOf(
    "ncfId", "plantId", "name", "variety", "latinName", "nfcType", "datum", "pos", "other"
)
