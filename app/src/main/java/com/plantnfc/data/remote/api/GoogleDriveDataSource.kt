package com.plantnfc.data.remote.api

import android.content.Context
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.api.client.googleapis.extensions.android.gms.auth.GoogleAccountCredential
import com.google.api.client.http.ByteArrayContent
import com.google.api.client.http.javanet.NetHttpTransport
import com.google.api.client.json.gson.GsonFactory
import com.google.api.services.drive.Drive
import com.google.api.services.drive.DriveScopes
import com.google.api.services.drive.model.File
import com.plantnfc.domain.model.NfcRecord
import com.plantnfc.domain.model.NfcType
import com.plantnfc.domain.model.SyncStatus
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Google Drive integration for NFC record sync.
 *
 * Strategy:
 *  - Stores all NFC records as a single JSON file in the app's Drive folder.
 *  - File name: "plantnfc_records.json"  (idempotent – one file per account)
 *  - On push: read remote → merge (local wins) → write back
 *  - On pull: read remote → merge (remote wins for synced records) → update local DB
 *
 * The Drive API is used via the Google API Java Client library (REST-based).
 */
@Singleton
class GoogleDriveDataSource @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        private const val APP_NAME   = "PlantNFC"
        private const val FILE_NAME  = "plantnfc_records.json"
        private const val MIME_JSON  = "application/json"
        private const val FOLDER_MIME = "application/vnd.google-apps.folder"
        private const val APP_FOLDER = "PlantNFC Data"
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Drive service factory
    // ──────────────────────────────────────────────────────────────────────────

    private fun buildDriveService(): Drive? {
        val account = GoogleSignIn.getLastSignedInAccount(context) ?: return null
        val credential = GoogleAccountCredential.usingOAuth2(
            context,
            listOf(DriveScopes.DRIVE_FILE)
        ).apply { selectedAccount = account.account }

        return Drive.Builder(
            NetHttpTransport(),
            GsonFactory.getDefaultInstance(),
            credential,
        ).setApplicationName(APP_NAME).build()
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Public API
    // ──────────────────────────────────────────────────────────────────────────

    /** Reads the remote NFC records JSON. Returns empty list if not found. */
    suspend fun readRemoteRecords(): List<NfcRecord> = withContext(Dispatchers.IO) {
        val drive = buildDriveService() ?: return@withContext emptyList()
        try {
            val fileId = findOrCreateFile(drive) ?: return@withContext emptyList()
            val content = drive.files().get(fileId)
                .executeMediaAsInputStream()
                .use { it.readBytes().toString(Charsets.UTF_8) }
            parseJson(content)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /** Writes the given list of NFC records to Drive (overwrites). */
    suspend fun writeRemoteRecords(records: List<NfcRecord>): Boolean = withContext(Dispatchers.IO) {
        val drive = buildDriveService() ?: return@withContext false
        try {
            val json    = encodeJson(records)
            val content = ByteArrayContent(MIME_JSON, json.toByteArray(Charsets.UTF_8))
            val fileId  = findOrCreateFile(drive)
            if (fileId != null) {
                drive.files().update(fileId, null, content).execute()
            } else {
                val folderId = findOrCreateFolder(drive)
                val meta = File().setName(FILE_NAME).setMimeType(MIME_JSON)
                    .also { if (folderId != null) it.parents = listOf(folderId) }
                drive.files().create(meta, content).execute()
            }
            true
        } catch (e: Exception) {
            false
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Drive folder/file helpers
    // ──────────────────────────────────────────────────────────────────────────

    private fun findOrCreateFolder(drive: Drive): String? {
        val result = drive.files().list()
            .setQ("mimeType='$FOLDER_MIME' and name='$APP_FOLDER' and trashed=false")
            .setSpaces("drive")
            .setFields("files(id)")
            .execute()
        if (result.files.isNotEmpty()) return result.files[0].id

        val meta = File().setName(APP_FOLDER).setMimeType(FOLDER_MIME)
        return drive.files().create(meta).setFields("id").execute().id
    }

    private fun findOrCreateFile(drive: Drive): String? {
        val result = drive.files().list()
            .setQ("name='$FILE_NAME' and mimeType='$MIME_JSON' and trashed=false")
            .setSpaces("drive")
            .setFields("files(id)")
            .execute()
        return result.files.firstOrNull()?.id
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  JSON serialisation
    // ──────────────────────────────────────────────────────────────────────────

    private fun encodeJson(records: List<NfcRecord>): String {
        val arr = JSONArray()
        records.forEach { r ->
            arr.put(JSONObject().apply {
                put("id",           r.id)
                put("nfcId",        r.nfcId)
                put("plantId",      r.plantId)
                put("plantName",    r.plantName)
                put("variety",      r.variety)
                put("latinName",    r.latinName)
                put("nfcType",      r.nfcType.code)
                put("datum",        r.datum)
                put("gpsPacket",    r.gpsPacket ?: "")
                put("other",        r.other ?: "")
                put("serialNumber", r.serialNumber ?: "")
                put("link",         r.link ?: "")
                put("createdAt",    r.createdAt ?: "")
                put("syncStatus",   r.syncStatus.name)
            })
        }
        return JSONObject().put("records", arr).toString(2)
    }

    private fun parseJson(json: String): List<NfcRecord> = runCatching {
        val arr = JSONObject(json).getJSONArray("records")
        (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            NfcRecord(
                id           = o.optLong("id"),
                nfcId        = o.optInt("nfcId"),
                plantId      = o.optString("plantId"),
                plantName    = o.optString("plantName"),
                variety      = o.optString("variety"),
                latinName    = o.optString("latinName"),
                nfcType      = NfcType.fromCode(o.optString("nfcType", "n")),
                datum        = o.optString("datum"),
                gpsPacket    = o.optString("gpsPacket").takeIf { it.isNotBlank() },
                other        = o.optString("other").takeIf { it.isNotBlank() },
                serialNumber = o.optString("serialNumber").takeIf { it.isNotBlank() },
                link         = o.optString("link").takeIf { it.isNotBlank() },
                createdAt    = o.optString("createdAt").takeIf { it.isNotBlank() },
                syncStatus   = runCatching { SyncStatus.valueOf(o.optString("syncStatus", "SYNCED")) }
                    .getOrDefault(SyncStatus.SYNCED),
            )
        }
    }.getOrDefault(emptyList())
}
