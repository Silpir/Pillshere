package app.pillshere.di

import android.content.Context
import androidx.room.Room
import app.pillshere.data.db.PillshereDb
import app.pillshere.data.prefs.SettingsStore
import app.pillshere.data.repo.DoseRepository
import app.pillshere.data.repo.MedRepository
import app.pillshere.notifications.Reminders

/**
 * Manual DI. Small app, small graph — a Hilt/Koin dependency would cost
 * more than it saves. Add fields here as needed; wire ViewModels via
 * `viewModel { ... }` factories in the UI layer.
 */
class AppContainer(context: Context) {
    private val appContext = context.applicationContext

    val db: PillshereDb = Room.databaseBuilder(
        appContext,
        PillshereDb::class.java,
        "pillshere.db",
    ).build()

    val medRepository = MedRepository(db.medicationDao())
    val doseRepository = DoseRepository(db.doseLogDao(), db.medicationDao())
    val settings = SettingsStore(appContext)
    val reminders = Reminders(appContext)
}
