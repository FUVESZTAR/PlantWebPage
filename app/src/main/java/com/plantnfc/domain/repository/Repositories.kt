package com.plantnfc.domain.repository

import com.plantnfc.domain.model.NfcRecord
import com.plantnfc.domain.model.Plant
import kotlinx.coroutines.flow.Flow

interface PlantRepository {
    /** Returns all NFC-active plants, using local cache when offline. */
    fun getActivePlants(): Flow<List<Plant>>

    /** Force-refresh plants from the remote Google Sheet. */
    suspend fun refreshPlants(): Result<Unit>

    /** Last sync timestamp (epoch ms), or null if never synced. */
    suspend fun lastSyncTime(): Long?
}

interface NfcRecordRepository {
    fun getAllRecords(): Flow<List<NfcRecord>>
    fun getRecord(id: Long): Flow<NfcRecord?>
    suspend fun insert(record: NfcRecord): Long
    suspend fun update(record: NfcRecord)
    suspend fun delete(id: Long)

    /** Upload all PENDING records to Google Drive / Sheets. */
    suspend fun syncToRemote(): Result<Unit>

    /** Fetch remote records and merge with local (last-write-wins). */
    suspend fun syncFromRemote(): Result<Unit>

    /** Auto-increment NFC ID counter. */
    suspend fun nextNfcId(): Int
}
