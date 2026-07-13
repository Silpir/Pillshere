package app.pillshere.data.db

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import app.pillshere.data.db.entities.Medication
import kotlinx.coroutines.flow.Flow

@Dao
interface MedicationDao {
    @Query("SELECT * FROM medications ORDER BY archivedAt IS NOT NULL, name COLLATE NOCASE")
    fun observeAll(): Flow<List<Medication>>

    @Query("SELECT * FROM medications WHERE archivedAt IS NULL ORDER BY name COLLATE NOCASE")
    fun observeActive(): Flow<List<Medication>>

    @Query("SELECT * FROM medications WHERE id = :id")
    suspend fun byId(id: String): Medication?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(med: Medication)

    @Update
    suspend fun update(med: Medication)

    @Delete
    suspend fun delete(med: Medication)
}
