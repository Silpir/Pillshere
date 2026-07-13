package app.pillshere.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import app.pillshere.data.db.entities.DoseLog
import app.pillshere.data.db.entities.Medication

@Database(
    entities = [Medication::class, DoseLog::class],
    version = 1,
    exportSchema = true,
)
@TypeConverters(Converters::class)
abstract class PillshereDb : RoomDatabase() {
    abstract fun medicationDao(): MedicationDao
    abstract fun doseLogDao(): DoseLogDao
}
