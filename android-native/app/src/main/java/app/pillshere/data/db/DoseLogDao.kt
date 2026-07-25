package app.pillshere.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import app.pillshere.data.db.entities.DoseLog
import kotlinx.coroutines.flow.Flow

@Dao
interface DoseLogDao {
    @Query("SELECT * FROM dose_log ORDER BY actedAt DESC LIMIT :limit")
    fun observeRecent(limit: Int = 200): Flow<List<DoseLog>>

    @Query("SELECT * FROM dose_log WHERE medId = :medId ORDER BY actedAt DESC")
    fun observeForMed(medId: String): Flow<List<DoseLog>>

    @Query("SELECT COUNT(*) FROM dose_log WHERE medId = :medId AND scheduledFor = :scheduledFor")
    suspend fun countFor(medId: String, scheduledFor: java.time.Instant): Int

    @Query("SELECT * FROM dose_log WHERE medId = :medId AND status = 'TAKEN' ORDER BY actedAt DESC LIMIT 1")
    suspend fun lastTaken(medId: String): DoseLog?

    @Query("SELECT * FROM dose_log")
    suspend fun all(): List<DoseLog>

    @Query("DELETE FROM dose_log")
    suspend fun clear()

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entry: DoseLog)

    @Query("DELETE FROM dose_log WHERE id = :id")
    suspend fun deleteById(id: String)
}
