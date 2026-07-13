# Pillshere — Native Android

Reference scaffold for the ground-up native rewrite. This folder is **not**
built by Lovable or the web project — copy it into a new standalone repo,
or open `android-native/` directly in Android Studio Koala or newer.

## Stack

- Kotlin 2.0, Jetpack Compose, Material 3
- Single-activity, MVVM (`ViewModel` + `StateFlow`)
- Room (SQLite) for meds + dose log
- DataStore Preferences for theme / first-run flags
- AlarmManager + BroadcastReceivers for reminders (no Play Services)
- Manual DI via `AppContainer` — no Hilt/Koin
- minSdk 26, targetSdk 35

## Build

```bash
cd android-native
./gradlew assembleDebug
./gradlew installDebug   # with a device/emulator attached
```

You need JDK 17 and the Android SDK (API 35). Run `./gradlew wrapper` once
locally if the Gradle wrapper jar is missing (it is not committed here).

## Reminder model

Each due dose = one exact alarm (`setExactAndAllowWhileIdle`) with a
`PendingIntent` keyed by `(medId, epochMillis)`. On fire, the receiver
posts a HIGH-importance notification with **Taken** and **Snooze 10 min**
actions, then schedules the med's next occurrence. `BOOT_COMPLETED`
reschedules the next 48 h window for every active med.

On Android 12+, if the user denies `SCHEDULE_EXACT_ALARM`, the app falls
back to `setAndAllowWhileIdle` (inexact, may drift by minutes) and shows
a banner linking to the system setting.
