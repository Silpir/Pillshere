package app.pillshere.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.content.getSystemService
import app.pillshere.data.db.entities.Medication
import app.pillshere.domain.Schedule
import java.time.Instant

/**
 * Single choke-point for scheduling exact alarms. All alarm code lives here
 * so failure modes (missing permission, PendingIntent flags, request-code
 * collisions) are debugged in one place.
 */
class Reminders(private val context: Context) {

    private val am: AlarmManager = context.getSystemService()!!

    fun scheduleNextWindow(med: Medication) {
        val times = Schedule.upcomingFireTimes(med)
        for (at in times) scheduleOne(med.id, at)
    }

    fun scheduleOne(medId: String, at: Instant) {
        val pi = fireIntent(medId, at)
        val triggerMs = at.toEpochMilli()
        val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()
        if (canExact) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi)
        } else {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi)
        }
        scheduleMissedCheck(medId, at)
    }

    /** Fires a follow-up ~15 min after the scheduled time. If the user
     *  hasn't confirmed Taken/Skipped by then, a missed-dose notification
     *  is posted. */
    fun scheduleMissedCheck(medId: String, at: Instant) {
        val pi = missedIntent(medId, at)
        val triggerMs = at.plusSeconds(MISSED_DELAY_MIN * 60L).toEpochMilli()
        val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()
        if (canExact) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi)
        } else {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi)
        }
    }

    fun cancelMissedCheck(medId: String, at: Instant) {
        am.cancel(missedIntent(medId, at))
    }

    fun cancel(medId: String, at: Instant) {
        am.cancel(fireIntent(medId, at, mutable = false))
    }

    private fun fireIntent(medId: String, at: Instant, mutable: Boolean = false): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            action = ACTION_FIRE
            putExtra(EXTRA_MED_ID, medId)
            putExtra(EXTRA_SCHEDULED_FOR_MS, at.toEpochMilli())
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            if (mutable) PendingIntent.FLAG_MUTABLE else PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getBroadcast(context, requestCode(medId, at), intent, flags)
    }

    private fun missedIntent(medId: String, at: Instant): PendingIntent {
        val intent = Intent(context, MissedCheckReceiver::class.java).apply {
            action = ACTION_MISSED_CHECK
            putExtra(EXTRA_MED_ID, medId)
            putExtra(EXTRA_SCHEDULED_FOR_MS, at.toEpochMilli())
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        // Offset request code so it doesn't collide with the primary fire alarm.
        return PendingIntent.getBroadcast(context, requestCode(medId, at) xor 0x4d495353, intent, flags)
    }

    private fun requestCode(medId: String, at: Instant): Int {
        // Stable per (medId, minute) so re-schedules replace the same alarm.
        val minute = at.toEpochMilli() / 60_000L
        return (medId.hashCode() * 31 + minute.toInt())
    }

    companion object {
        const val ACTION_FIRE = "app.pillshere.action.FIRE"
        const val ACTION_MISSED_CHECK = "app.pillshere.action.MISSED_CHECK"
        const val EXTRA_MED_ID = "medId"
        const val EXTRA_SCHEDULED_FOR_MS = "scheduledForMs"
        const val MISSED_DELAY_MIN = 15L
    }
}
