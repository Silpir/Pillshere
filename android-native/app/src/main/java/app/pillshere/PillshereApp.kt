package app.pillshere

import android.app.Application
import app.pillshere.di.AppContainer
import app.pillshere.notifications.NotificationChannels

class PillshereApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        NotificationChannels.ensure(this)
    }
}
