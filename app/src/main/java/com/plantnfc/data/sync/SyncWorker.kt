package com.plantnfc.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.plantnfc.domain.repository.NfcRecordRepository
import com.plantnfc.domain.repository.PlantRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

/**
 * Background sync worker.
 * Scheduled to run periodically (every 6 hours) via WorkManager.
 * Handles:
 *  1. Refresh plant list from Google Sheets
 *  2. Push pending NFC records to Google Drive
 *  3. Pull remote changes back to local DB
 */
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val plantRepository: PlantRepository,
    private val nfcRecordRepository: NfcRecordRepository,
) : CoroutineWorker(context, workerParams) {

    companion object {
        const val WORK_NAME = "plantnfc_sync"

        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<SyncWorker>(6, TimeUnit.HOURS)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }

        fun scheduleOneShot(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueue(request)
        }
    }

    override suspend fun doWork(): Result {
        return try {
            // 1. Refresh plant cache from Google Sheets
            plantRepository.refreshPlants().getOrThrow()

            // 2. Push pending NFC records to Drive
            nfcRecordRepository.syncToRemote().getOrThrow()

            // 3. Pull remote changes (in case other devices added records)
            nfcRecordRepository.syncFromRemote().getOrThrow()

            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
}
