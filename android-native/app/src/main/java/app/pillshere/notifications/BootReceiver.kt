package app.pillshere.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.pillshere.PillshereApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        val app = context.applicationContext as PillshereApp
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val meds = app.container.medRepository.observeActive().first()
                for (med in meds) app.container.reminders.scheduleNextWindow(med)
            } finally { pending.finish() }
        }
    }
}
