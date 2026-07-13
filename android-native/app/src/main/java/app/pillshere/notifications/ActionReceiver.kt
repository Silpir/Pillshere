package app.pillshere.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import app.pillshere.PillshereApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant

class ActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val medId = intent.getStringExtra(Reminders.EXTRA_MED_ID) ?: return
        val scheduledForMs = intent.getLongExtra(Reminders.EXTRA_SCHEDULED_FOR_MS, 0L)
        val notifId = intent.getIntExtra(EXTRA_NOTIF_ID, -1)
        val app = context.applicationContext as PillshereApp
        val pending = goAsync()

        when (intent.action) {
            ACTION_TAKEN -> CoroutineScope(Dispatchers.IO).launch {
                try {
                    app.container.doseRepository.recordTaken(
                        medId, Instant.ofEpochMilli(scheduledForMs),
                    )
                    if (notifId != -1) NotificationManagerCompat.from(context).cancel(notifId)
                } finally { pending.finish() }
            }
            ACTION_SNOOZE -> CoroutineScope(Dispatchers.IO).launch {
                try {
                    val fireAt = Instant.now().plusSeconds(10 * 60)
                    app.container.reminders.scheduleOne(medId, fireAt)
                    if (notifId != -1) NotificationManagerCompat.from(context).cancel(notifId)
                } finally { pending.finish() }
            }
            else -> pending.finish()
        }
    }

    companion object {
        const val ACTION_TAKEN = "app.pillshere.action.TAKEN"
        const val ACTION_SNOOZE = "app.pillshere.action.SNOOZE"
        const val EXTRA_NOTIF_ID = "notifId"
    }
}
