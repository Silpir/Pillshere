package app.pillshere.notifications

import android.Manifest
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings

/**
 * Runtime notification-permission helpers. Pre-Android 13 the manifest
 * declaration is enough; on T+ we must ask at runtime and may need to
 * deep-link users to system settings when permanently denied.
 */
object NotificationPermissions {

    /** True when reminder notifications can actually be posted. */
    fun isGranted(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
                android.content.pm.PackageManager.PERMISSION_GRANTED

    /** Opens this app's system-settings page (toggle lives there once denied). */
    fun openAppSettings(context: Context) {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.parse("package:" + context.packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }
}