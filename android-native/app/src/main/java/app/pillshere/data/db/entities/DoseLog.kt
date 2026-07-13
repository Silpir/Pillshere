package app.pillshere.data.db.entities

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.time.Instant

enum class DoseStatus { TAKEN, SKIPPED, SNOOZED }

@Entity(
    tableName = "dose_log",
    foreignKeys = [
        ForeignKey(
            entity = Medication::class,
            parentColumns = ["id"],
            childColumns = ["medId"],
            onDelete = ForeignKey.CASCADE,
        )
    ],
    indices = [Index("medId"), Index("scheduledFor")],
)
data class DoseLog(
    @PrimaryKey val id: String,
    val medId: String,
    val scheduledFor: Instant,
    val actedAt: Instant,
    val status: DoseStatus,
    val pillsConsumed: Int,
)
