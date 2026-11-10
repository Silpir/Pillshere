package app.pillshere.domain

import app.pillshere.data.db.entities.Medication
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * Pure functions over medication schedules. Kept dependency-free so unit
 * tests run on the JVM without Android or Room in scope.
 */
object Schedule {

    /**
     * Upcoming fire times for `med` within [now, now + windowHours), in
     * chronological order. Uses the device's default zone; callers that
     * need determinism should inject their own zone.
     */
    fun upcomingFireTimes(
        med: Medication,
        now: Instant = Instant.now(),
        windowHours: Long = 48,
        zone: ZoneId = ZoneId.systemDefault(),
    ): List<Instant> {
        if (med.archivedAt != null || med.times.isEmpty()) return emptyList()
        val end = now.plusSeconds(windowHours * 3600)
        // Anchor on the day containing [now] (not wall-clock "today") so callers
        // can inject deterministic instants for tests or backfills.
        var day = LocalDate.ofInstant(now, zone)
        val out = mutableListOf<Instant>()
        while (true) {
            for (t in med.times) {
                val at = LocalDateTime.of(day, t).atZone(zone).toInstant()
                if (at.isBefore(now)) continue
                if (at.isAfter(end)) return out.sorted()
                out += at
            }
            day = day.plusDays(1)
            if (day.atStartOfDay(zone).toInstant().isAfter(end)) return out.sorted()
        }
    }

    fun isLowSupply(med: Medication): Boolean =
        med.currentPills <= med.lowSupplyThreshold
}
