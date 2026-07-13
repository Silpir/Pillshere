package app.pillshere.data.db

import androidx.room.TypeConverter
import app.pillshere.data.db.entities.DoseStatus
import java.time.Instant
import java.time.LocalTime
import java.time.format.DateTimeFormatter

class Converters {
    @TypeConverter fun instantToString(v: Instant?): String? = v?.toString()
    @TypeConverter fun stringToInstant(v: String?): Instant? = v?.let(Instant::parse)

    @TypeConverter
    fun timesToString(v: List<LocalTime>): String =
        v.joinToString(",") { it.format(DateTimeFormatter.ofPattern("HH:mm")) }

    @TypeConverter
    fun stringToTimes(v: String): List<LocalTime> =
        if (v.isBlank()) emptyList()
        else v.split(",").map { LocalTime.parse(it.trim(), DateTimeFormatter.ofPattern("HH:mm")) }

    @TypeConverter fun statusToString(v: DoseStatus): String = v.name
    @TypeConverter fun stringToStatus(v: String): DoseStatus = DoseStatus.valueOf(v)
}
