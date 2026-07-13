package app.pillshere.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.core.content.getSystemService
import app.pillshere.R

object NotificationChannels {
    const val REMINDERS = "reminders"

    fun ensure(context: Context) {
        val nm = context.getSystemService<NotificationManager>() ?: return
        if (nm.getNotificationChannel(REMINDERS) != null) return
        val channel = NotificationChannel(
            REMINDERS,
            context.getString(R.string.channel_reminders),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = context.getString(R.string.channel_reminders_desc)
            enableVibration(true)
        }
        nm.createNotificationChannel(channel)
    }
}
