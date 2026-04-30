package com.plantnfc.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "plant_nfc_prefs")

@Singleton
class AppPreferences @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        val KEY_LANGUAGE       = stringPreferencesKey("language")          // "en" | "hu"
        val KEY_SHEET_ID       = stringPreferencesKey("sheet_id")
        val KEY_SHEET_WRITER_URL = stringPreferencesKey("sheet_writer_url")
        val KEY_LAST_SYNC_TIME = stringPreferencesKey("last_sync_time")
        val KEY_BASE_URL       = stringPreferencesKey("base_url")          // link builder base
    }

    val language: Flow<String> = context.dataStore.data.map {
        it[KEY_LANGUAGE] ?: "hu"
    }

    val sheetId: Flow<String> = context.dataStore.data.map {
        it[KEY_SHEET_ID] ?: "1QHJzWztssucMlnozk2tV9ym6gLedgDj4Zh3DzCTFWCY"
    }

    val baseUrl: Flow<String> = context.dataStore.data.map {
        it[KEY_BASE_URL] ?: "https://your-domain.com/W/P.html"
    }

    suspend fun setLanguage(lang: String) {
        context.dataStore.edit { it[KEY_LANGUAGE] = lang }
    }

    suspend fun setSheetId(id: String) {
        context.dataStore.edit { it[KEY_SHEET_ID] = id }
    }

    suspend fun setBaseUrl(url: String) {
        context.dataStore.edit { it[KEY_BASE_URL] = url }
    }

    suspend fun setLastSyncTime(time: String) {
        context.dataStore.edit { it[KEY_LAST_SYNC_TIME] = time }
    }
}
