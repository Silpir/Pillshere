package app.pillshere.data.repo

import app.pillshere.data.db.DoseLogDao
import app.pillshere.data.db.MedicationDao
import app.pillshere.data.db.entities.DoseLog
import app.pillshere.data.db.entities.DoseStatus
import java.time.Instant
import java.util.UUID
import kotlinx.coroutines.flow.Flow

class DoseRepository(
    private val doseDao: DoseLogDao,
    private val medDao: MedicationDao,
) {
    fun observeRecent(): Flow<List<DoseLog>> = doseDao.observeRecent()

    suspend fun wasActed(medId: String, scheduledFor: Instant): Boolean =
        doseDao.countFor(medId, scheduledFor) > 0

    /** Most-recent TAKEN entry for this medication, or null. */
    suspend fun lastTaken(medId: String) = doseDao.lastTaken(medId)

    suspend fun recordTaken(medId: String, scheduledFor: Instant): DoseLog {
        val med = medDao.byId(medId) ?: error("Medication $medId not found")
        val entry = DoseLog(
            id = UUID.randomUUID().toString(),
            medId = medId,
            scheduledFor = scheduledFor,
            actedAt = Instant.now(),
            status = DoseStatus.TAKEN,
            pillsConsumed = med.pillsPerDose,
        )
        doseDao.insert(entry)
        val newPills = (med.currentPills - med.pillsPerDose).coerceAtLeast(0)
        medDao.update(med.copy(currentPills = newPills))
        return entry
    }

    suspend fun recordSkipped(medId: String, scheduledFor: Instant) {
        doseDao.insert(
            DoseLog(
                id = UUID.randomUUID().toString(),
                medId = medId,
                scheduledFor = scheduledFor,
                actedAt = Instant.now(),
                status = DoseStatus.SKIPPED,
                pillsConsumed = 0,
            )
        )
    }

    suspend fun undo(entry: DoseLog) {
        if (entry.pillsConsumed > 0) {
            val med = medDao.byId(entry.medId) ?: return
            medDao.update(med.copy(currentPills = med.currentPills + entry.pillsConsumed))
        }
        doseDao.deleteById(entry.id)
    }
}
