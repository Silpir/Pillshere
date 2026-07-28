package app.pillshere.data.backup

import android.content.Context
import android.net.Uri
import app.pillshere.data.db.PillshereDb
import app.pillshere.data.db.entities.DoseLog
import app.pillshere.data.db.entities.DoseStatus
import app.pillshere.data.db.entities.Medication
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalTime
import java.time.format.DateTimeFormatter

/**
 * Export/import of the local database to a user-chosen JSON file via SAF.
 * File contents are portable: reinstalling Pillshere and importing the
 * same file restores medications and dose history verbatim.
 */
class BackupManager(private val context: Context, private val db: PillshereDb) {

    private val hhmm = DateTimeFormatter.ofPattern("HH:mm")

    suspend fun exportTo(uri: Uri): Int = withContext(Dispatchers.IO) {
        val meds = db.medicationDao().all()
        val doses = db.doseLogDao().all()
        val root = JSONObject().apply {
            put("app", "pillshere")
            put("version", 1)
            put("exportedAt", Instant.now().toString())
            put("medications", JSONArray().also { arr -> meds.forEach { arr.put(medToJson(it)) } })
            put("doseLog", JSONArray().also { arr -> doses.forEach { arr.put(doseToJson(it)) } })
        }
        context.contentResolver.openOutputStream(uri, "wt")?.use { out ->
            out.write(root.toString(2).toByteArray(Charsets.UTF_8))
        } ?: error("Could not open file for writing")
        meds.size + doses.size
    }

    /** Returns Pair(medsImported, dosesImported). Replaces existing data. */
    suspend fun importFrom(uri: Uri): Pair<Int, Int> = withContext(Dispatchers.IO) {
        val text = context.contentResolver.openInputStream(uri)?.use {
            it.readBytes().toString(Charsets.UTF_8)
        } ?: error("Could not open file for reading")
        val root = JSONObject(text)
        require(root.optString("app") == "pillshere") { "Not a Pillshere backup file" }
        val meds = mutableListOf<Medication>()
        val medsArr = root.optJSONArray("medications") ?: JSONArray()
        for (i in 0 until medsArr.length()) meds += medFromJson(medsArr.getJSONObject(i))
        val doses = mutableListOf<DoseLog>()
        val dosesArr = root.optJSONArray("doseLog") ?: JSONArray()
        for (i in 0 until dosesArr.length()) doses += doseFromJson(dosesArr.getJSONObject(i))

        // Doses have a FK to medications; clear child rows first.
        db.doseLogDao().clear()
        db.medicationDao().clear()
        meds.forEach { db.medicationDao().upsert(it) }
        doses.forEach { db.doseLogDao().insert(it) }
        meds.size to doses.size
    }

    private fun medToJson(m: Medication) = JSONObject().apply {
        put("id", m.id)
        put("name", m.name)
        put("dosageText", m.dosageText)
        put("pillsPerDose", m.pillsPerDose)
        put("currentPills", m.currentPills)
        put("lowSupplyThreshold", m.lowSupplyThreshold)
        put("times", JSONArray().also { arr -> m.times.forEach { arr.put(it.format(hhmm)) } })
        put("createdAt", m.createdAt.toString())
        put("notificationsEnabled", m.notificationsEnabled)
        put("missedAfterMinutes", m.missedAfterMinutes)
        m.archivedAt?.let { put("archivedAt", it.toString()) }
    }

    private fun medFromJson(o: JSONObject): Medication {
        val times = mutableListOf<LocalTime>()
        val arr = o.getJSONArray("times")
        for (i in 0 until arr.length()) times += LocalTime.parse(arr.getString(i), hhmm)
        return Medication(
            id = o.getString("id"),
            name = o.getString("name"),
            dosageText = o.optString("dosageText", ""),
            pillsPerDose = o.getInt("pillsPerDose"),
            currentPills = o.getInt("currentPills"),
            lowSupplyThreshold = o.optInt("lowSupplyThreshold", 0),
            times = times,
            createdAt = Instant.parse(o.getString("createdAt")),
            notificationsEnabled = o.optBoolean("notificationsEnabled", true),
            missedAfterMinutes = o.optInt("missedAfterMinutes", 15),
            archivedAt = if (o.has("archivedAt") && !o.isNull("archivedAt"))
                Instant.parse(o.getString("archivedAt")) else null,
        )
    }

    private fun doseToJson(d: DoseLog) = JSONObject().apply {
        put("id", d.id)
        put("medId", d.medId)
        put("scheduledFor", d.scheduledFor.toString())
        put("actedAt", d.actedAt.toString())
        put("status", d.status.name)
        put("pillsConsumed", d.pillsConsumed)
    }

    private fun doseFromJson(o: JSONObject) = DoseLog(
        id = o.getString("id"),
        medId = o.getString("medId"),
        scheduledFor = Instant.parse(o.getString("scheduledFor")),
        actedAt = Instant.parse(o.getString("actedAt")),
        status = DoseStatus.valueOf(o.getString("status")),
        pillsConsumed = o.optInt("pillsConsumed", 0),
    )
}