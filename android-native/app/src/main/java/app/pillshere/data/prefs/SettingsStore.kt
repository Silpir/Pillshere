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
    /** One-time runtime permission prompt flag — never nag past the first ask. */
    val notifPermPrompted = context.dataStore.data.map { it[NOTIF_PROMPTED] ?: false }

    suspend fun setTheme(mode: String) {
        context.dataStore.edit { it[THEME] = mode }
    }

    suspend fun setExactAlarmDenied(denied: Boolean) {
        context.dataStore.edit { it[EXACT_DENIED] = denied }
    }

    suspend fun setNotifPermPrompted(value: Boolean) {
        context.dataStore.edit { it[NOTIF_PROMPTED] = value }
    }

    private companion object {
        val THEME = stringPreferencesKey("theme")
        val EXACT_DENIED = booleanPreferencesKey("exact_alarm_denied")
        val NOTIF_PROMPTED = booleanPreferencesKey("notif_perm_prompted")
    }
}
