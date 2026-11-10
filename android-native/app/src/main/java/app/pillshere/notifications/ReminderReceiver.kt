package app.pillshere.notifications

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import app.pillshere.MainActivity
import app.pillshere.PillshereApp
import app.pillshere.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val medId = intent.getStringExtra(Reminders.EXTRA_MED_ID) ?: return
        val scheduledForMs = intent.getLongExtra(Reminders.EXTRA_SCHEDULED_FOR_MS, 0L)
        val app = context.applicationContext as PillshereApp

        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val med = app.container.medRepository.byId(medId) ?: return@launch
                if (med.notificationsEnabled) {
                    postNotification(context, medId, med.name, scheduledForMs)
                }
                // Schedule the next occurrence for this med.
                app.container.reminders.scheduleNextWindow(med)
            } finally {
                pending.finish()
            }
        }
    }

    private fun postNotification(
        context: Context,
        medId: String,
        medName: String,
        scheduledForMs: Long,
    ) {
        val notifId = (medId.hashCode() * 31 + (scheduledForMs / 60_000L).toInt())

        val takenIntent = Intent(context, ActionReceiver::class.java).apply {
            action = ActionReceiver.ACTION_TAKEN
            putExtra(Reminders.EXTRA_MED_ID, medId)
            putExtra(Reminders.EXTRA_SCHEDULED_FOR_MS, scheduledForMs)
            putExtra(ActionReceiver.EXTRA_NOTIF_ID, notifId)
        }
        val snoozeIntent = Intent(context, ActionReceiver::class.java).apply {
            action = ActionReceiver.ACTION_SNOOZE
            putExtra(Reminders.EXTRA_MED_ID, medId)
            putExtra(Reminders.EXTRA_SCHEDULED_FOR_MS, scheduledForMs)
            putExtra(ActionReceiver.EXTRA_NOTIF_ID, notifId)
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val takenPi = PendingIntent.getBroadcast(context, notifId * 2, takenIntent, flags)
        val snoozePi = PendingIntent.getBroadcast(context, notifId * 2 + 1, snoozeIntent, flags)
        // Tapping the notification body opens the app on its default Today tab.
        val contentPi = PendingIntent.getActivity(
            context,
            notifId * 2 + 4,
            Intent(context, MainActivity::class.java),
            flags,
        )

        val n = NotificationCompat.Builder(context, NotificationChannels.REMINDERS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(medName)
            .setContentText("Time to take your medication")
            .setContentIntent(contentPi)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .addAction(0, context.getString(R.string.action_taken), takenPi)
            .addAction(0, context.getString(R.string.action_snooze), snoozePi)
            .build()

        NotificationManagerCompat.from(context).notify(notifId, n)
    }
}
