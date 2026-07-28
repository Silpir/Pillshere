package app.pillshere.data.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.Instant
import java.time.LocalTime

@Entity(tableName = "medications")
data class Medication(
    @PrimaryKey val id: String,
    val name: String,
    val dosageText: String,
    val pillsPerDose: Int,
    val currentPills: Int,
    val lowSupplyThreshold: Int,
    /** Persisted as a comma-separated list of HH:mm strings via Converters. */
    val times: List<LocalTime>,
    val createdAt: Instant,
    val archivedAt: Instant? = null,
    /** When false, no reminder or missed-dose notifications are posted. */
    val notificationsEnabled: Boolean = true,
    /** Minutes after the scheduled time before a missed-dose alert fires. */
    val missedAfterMinutes: Int = 15,
)
