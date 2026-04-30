package com.plantnfc.data.repository

import com.plantnfc.data.local.dao.NfcRecordDao
import com.plantnfc.data.local.dao.PlantDao
import com.plantnfc.data.local.entities.NfcRecordEntity
import com.plantnfc.data.local.entities.PlantEntity
import com.plantnfc.data.remote.api.GoogleDriveDataSource
import com.plantnfc.data.remote.api.GoogleSheetsDataSource
import com.plantnfc.domain.model.NfcRecord
import com.plantnfc.domain.model.NfcType
import com.plantnfc.domain.model.Plant
import com.plantnfc.domain.model.SyncStatus
import com.plantnfc.domain.repository.NfcRecordRepository
import com.plantnfc.domain.repository.PlantRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

// ──────────────────────────────────────────────────────────────────────────────
//  Plant repository
// ──────────────────────────────────────────────────────────────────────────────

@Singleton
class PlantRepositoryImpl @Inject constructor(
    private val plantDao: PlantDao,
    private val sheetsDataSource: GoogleSheetsDataSource,
) : PlantRepository {

    override fun getActivePlants(): Flow<List<Plant>> =
        plantDao.observeActivePlants().map { list -> list.map(PlantEntity::toDomain) }

    override suspend fun refreshPlants(): Result<Unit> = runCatching {
        val remote = sheetsDataSource.loadActivePlants()
        plantDao.deleteAll()
        plantDao.insertAll(remote.map(Plant::toEntity))
    }

    override suspend fun lastSyncTime(): Long? = plantDao.lastCacheTime()
}

// ──────────────────────────────────────────────────────────────────────────────
//  NFC record repository
// ──────────────────────────────────────────────────────────────────────────────

@Singleton
class NfcRecordRepositoryImpl @Inject constructor(
    private val nfcRecordDao: NfcRecordDao,
    private val driveDataSource: GoogleDriveDataSource,
) : NfcRecordRepository {

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    override fun getAllRecords(): Flow<List<NfcRecord>> =
        nfcRecordDao.observeAll().map { list -> list.map(NfcRecordEntity::toDomain) }

    override fun getRecord(id: Long): Flow<NfcRecord?> =
        nfcRecordDao.observeById(id).map { it?.toDomain() }

    override suspend fun insert(record: NfcRecord): Long {
        val today = dateFormat.format(Date())
        return nfcRecordDao.insert(record.copy(createdAt = today, syncStatus = SyncStatus.PENDING).toEntity())
    }

    override suspend fun update(record: NfcRecord) {
        nfcRecordDao.update(record.copy(syncStatus = SyncStatus.PENDING).toEntity())
    }

    override suspend fun delete(id: Long) = nfcRecordDao.deleteById(id)

    override suspend fun syncToRemote(): Result<Unit> = runCatching {
        val local = nfcRecordDao.observeAll().let {
            // Snapshot via suspend
            nfcRecordDao.getPending().map(NfcRecordEntity::toDomain)
        }
        val remote = driveDataSource.readRemoteRecords()
        val remoteMap = remote.associateBy { it.id }

        // Merge: local PENDING always wins (local-first strategy)
        val merged = remote.toMutableList()
        local.forEach { localRecord ->
            val idx = merged.indexOfFirst { it.id == localRecord.id }
            if (idx >= 0) merged[idx] = localRecord else merged.add(localRecord)
        }

        val success = driveDataSource.writeRemoteRecords(merged)
        if (success) {
            local.forEach { nfcRecordDao.updateSyncStatus(it.id, SyncStatus.SYNCED.name) }
        } else {
            error("Drive write failed")
        }
    }

    override suspend fun syncFromRemote(): Result<Unit> = runCatching {
        val remote = driveDataSource.readRemoteRecords()
        remote.forEach { remoteRecord ->
            nfcRecordDao.insert(remoteRecord.copy(syncStatus = SyncStatus.SYNCED).toEntity())
        }
    }

    override suspend fun nextNfcId(): Int = (nfcRecordDao.maxNfcId() ?: 0) + 1
}

// ──────────────────────────────────────────────────────────────────────────────
//  Mappers
// ──────────────────────────────────────────────────────────────────────────────

fun PlantEntity.toDomain() = Plant(
    plantId     = plantId,
    latinName   = latinName,
    nameVariety = nameVariety,
    nameHu      = nameHu,
    nameEn      = nameEn,
    activeInNfc = activeInNfc,
    activeInPage = activeInPage,
)

fun Plant.toEntity() = PlantEntity(
    plantId     = plantId,
    latinName   = latinName,
    nameVariety = nameVariety,
    nameHu      = nameHu,
    nameEn      = nameEn,
    activeInNfc = activeInNfc,
    activeInPage = activeInPage,
)

fun NfcRecordEntity.toDomain() = NfcRecord(
    id           = id,
    nfcId        = nfcId,
    plantId      = plantId,
    plantName    = plantName,
    variety      = variety,
    latinName    = latinName,
    nfcType      = NfcType.fromCode(nfcTypeCode),
    datum        = datum,
    gpsPacket    = gpsPacket,
    other        = other,
    serialNumber = serialNumber,
    link         = link,
    createdAt    = createdAt,
    syncStatus   = runCatching { SyncStatus.valueOf(syncStatus) }.getOrDefault(SyncStatus.PENDING),
)

fun NfcRecord.toEntity() = NfcRecordEntity(
    id           = id,
    nfcId        = nfcId,
    plantId      = plantId,
    plantName    = plantName,
    variety      = variety,
    latinName    = latinName,
    nfcTypeCode  = nfcType.code,
    datum        = datum,
    gpsPacket    = gpsPacket,
    other        = other,
    serialNumber = serialNumber,
    link         = link,
    createdAt    = createdAt,
    syncStatus   = syncStatus.name,
)
