package app.pillshere.data.repo

import app.pillshere.data.db.MedicationDao
import app.pillshere.data.db.entities.Medication
import kotlinx.coroutines.flow.Flow

import app.pillshere.domain.Schedule

class MedRepository(private val dao: MedicationDao) {
    fun observeActive(): Flow<List<Medication>> = dao.observeActive()
    fun observeAll(): Flow<List<Medication>> = dao.observeAll()
    suspend fun byId(id: String) = dao.byId(id)
    suspend fun upsert(med: Medication) = dao.upsert(med)
    suspend fun update(med: Medication) = dao.update(med)
    suspend fun delete(med: Medication) = dao.delete(med)
}
