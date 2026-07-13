package app.pillshere.domain

import app.pillshere.data.db.entities.Medication
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

class ScheduleTest {
    private val zone: ZoneId = ZoneId.of("UTC")

    private fun med(times: List<LocalTime>) = Medication(
        id = "m1",
        name = "Test",
        dosageText = "10 mg",
        pillsPerDose = 1,
        currentPills = 30,
        lowSupplyThreshold = 5,
        times = times,
        createdAt = Instant.parse("2025-01-01T00:00:00Z"),
    )

    @Test fun `returns nothing when times empty`() {
        val out = Schedule.upcomingFireTimes(med(emptyList()), zone = zone)
        assertTrue(out.isEmpty())
    }

    @Test fun `schedules within window in order`() {
        val now = LocalDate.of(2025, 1, 1).atTime(7, 0).atZone(zone).toInstant()
        val m = med(listOf(LocalTime.of(8, 0), LocalTime.of(20, 0)))
        val out = Schedule.upcomingFireTimes(m, now = now, windowHours = 24, zone = zone)
        assertEquals(2, out.size)
        assertTrue(out[0].isBefore(out[1]))
    }

    @Test fun `skips archived meds`() {
        val m = med(listOf(LocalTime.NOON)).copy(archivedAt = Instant.now())
        assertTrue(Schedule.upcomingFireTimes(m, zone = zone).isEmpty())
    }
}
