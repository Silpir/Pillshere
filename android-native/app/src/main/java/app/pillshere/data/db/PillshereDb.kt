package app.pillshere.data.db

import androidx.room.Database
import androidx.room.migration.Migration
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.sqlite.db.SupportSQLiteDatabase
import app.pillshere.data.db.entities.DoseLog
import app.pillshere.data.db.entities.Medication

@Database(
    entities = [Medication::class, DoseLog::class],
    version = 2,
    exportSchema = true,
)
@TypeConverters(Converters::class)
abstract class PillshereDb : RoomDatabase() {
    abstract fun medicationDao(): MedicationDao
    abstract fun doseLogDao(): DoseLogDao

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "ALTER TABLE medications ADD COLUMN notificationsEnabled INTEGER NOT NULL DEFAULT 1"
                )
                db.execSQL(
                    "ALTER TABLE medications ADD COLUMN missedAfterMinutes INTEGER NOT NULL DEFAULT 15"
                )
            }
        }
    }
}
