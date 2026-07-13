package app.pillshere.data.prefs

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "pillshere_settings")

class SettingsStore(private val context: Context) {
    val themeMode = context.dataStore.data.map { it[THEME] ?: "system" }
    val exactAlarmDenied = context.dataStore.data.map { it[EXACT_DENIED] ?: false }

    suspend fun setTheme(mode: String) {
        context.dataStore.edit { it[THEME] = mode }
    }

    suspend fun setExactAlarmDenied(denied: Boolean) {
        context.dataStore.edit { it[EXACT_DENIED] = denied }
    }

    private companion object {
        val THEME = stringPreferencesKey("theme")
        val EXACT_DENIED = booleanPreferencesKey("exact_alarm_denied")
    }
}
