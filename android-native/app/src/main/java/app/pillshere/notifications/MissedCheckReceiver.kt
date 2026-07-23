package app.pillshere.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import app.pillshere.PillshereApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Fires a short time after a scheduled dose. If the user has not
 * confirmed the dose (Taken/Skipped) by then, we post a "missed dose"
 * notification so it's obvious past the scheduled time.
 */
class MissedCheckReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val medId = intent.getStringExtra(Reminders.EXTRA_MED_ID) ?: return
        val scheduledForMs = intent.getLongExtra(Reminders.EXTRA_SCHEDULED_FOR_MS, 0L)
        if (scheduledForMs == 0L) return
        val app = context.applicationContext as PillshereApp
        val pending = goAsync()

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val scheduledFor = Instant.ofEpochMilli(scheduledForMs)
                if (app.container.doseRepository.wasActed(medId, scheduledFor)) return@launch
                val med = app.container.medRepository.byId(medId) ?: return@launch
                val fmt = DateTimeFormatter.ofPattern("h:mm a").withZone(ZoneId.systemDefault())
                val notifId = (medId.hashCode() * 31 + (scheduledForMs / 60_000L).toInt()) xor 0x4d495353

                val n = NotificationCompat.Builder(context, NotificationChannels.REMINDERS)
                    .setSmallIcon(android.R.drawable.ic_dialog_alert)
                    .setContentTitle("${med.name} hasn't been taken")
                    .setContentText("Scheduled at ${fmt.format(scheduledFor)}")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_REMINDER)
                    .setAutoCancel(true)
                    .build()
                NotificationManagerCompat.from(context).notify(notifId, n)
            } finally {
                pending.finish()
            }
        }
    }
}
