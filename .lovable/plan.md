# Native Pillshere (Kotlin + Compose) — v1 plan

A ground-up rewrite as a truly native Android app. New standalone repo, no code shared with this web/Capacitor project. Fresh install, no data migration. Ship the smallest thing that works, with tight failure surfaces.

## Goals

- Native performance: cold start under 1 s on a mid-range phone, no WebView, no JS bridge.
- Small APK: target under 5 MB download size.
- Few moving parts: one process, one local database, one notification scheduler, zero backend.
- Reliable reminders: notifications fire even when the app is killed and after reboot.

## Scope (v1)

In:
- Medications CRUD (name, dose, schedule times, pills per dose, supply).
- Today screen: due doses, mark Taken / Skipped, undo.
- History screen: dose log with filters by med and date.
- Local notifications with Taken and Snooze 10 min actions, fired natively.
- Dark mode following system.

Out (deferred, not in v1):
- Google Drive backup / restore.
- Refill planning UI (data model keeps supply, no dedicated refill flow yet).
- Multi-device sync, accounts, cloud, analytics.
- Tablet / foldable adaptive layouts beyond what Compose gives for free.
- Widgets, Wear OS, iOS.

## Tech choices (lean defaults)

| Concern | Choice | Why |
| --- | --- | --- |
| Language | Kotlin 2.x | Google standard. |
| UI | Jetpack Compose + Material 3 | Less code than XML, matches system look. |
| Min / target SDK | minSdk 26 (Android 8), targetSdk 35 | Covers ~97% of devices, drops legacy alarm quirks. |
| Architecture | Single-activity, MVVM with `ViewModel` + `StateFlow` | Standard, no extra libs. |
| DI | Manual constructor injection via a small `AppContainer` | No Hilt / Koin — fewer failure points for a small app. |
| Persistence | Room (SQLite) | Type-safe, migrations built in, better than raw SharedPreferences for logs. |
| Preferences | DataStore (Preferences) | Theme + first-run flags only. |
| Navigation | Compose Navigation (`androidx.navigation:navigation-compose`) | Type-safe routes, no third-party router. |
| Concurrency | Kotlin coroutines + `Flow` | Native, no RxJava. |
| Reminders | `AlarmManager` with `setExactAndAllowWhileIdle` + `BroadcastReceiver` + `NotificationManagerCompat` | Fires reliably when app is killed; no Google Play Services dependency. |
| Reboot survival | `BOOT_COMPLETED` receiver reschedules from Room | Standard pattern. |
| Build | Gradle Kotlin DSL + version catalog (`libs.versions.toml`) | Modern default. |
| Testing | JUnit4 + Compose UI test + Room in-memory tests | Enough for v1. |
| Lint / format | Android Lint + ktlint | Catches common issues in CI. |
| CI | GitHub Actions: assemble debug + unit tests on PR | Cheap safety net. |

Explicitly rejected for v1: Hilt, WorkManager (AlarmManager is a better fit for exact-time reminders), Retrofit / OkHttp (no network), Firebase, Crashlytics, Coil (no remote images yet), Ktor, KMP, Compose Multiplatform.

## Repo layout (new repo)

```text
pillshere-android/
  app/
    src/main/
      java/app/pillshere/
        PillshereApp.kt          // Application, builds AppContainer
        di/AppContainer.kt       // manual DI
        data/
          db/PillshereDb.kt      // Room database + DAOs
          db/entities/*.kt       // Medication, DoseLog
          repo/MedRepository.kt
          repo/DoseRepository.kt
          prefs/SettingsStore.kt // DataStore
        domain/
          Schedule.kt            // pure functions: next fire times, low supply
        notifications/
          Reminders.kt           // schedule/cancel via AlarmManager
          ReminderReceiver.kt    // BroadcastReceiver -> post notification
          ActionReceiver.kt      // Taken / Snooze actions
          BootReceiver.kt        // reschedule on BOOT_COMPLETED
        ui/
          theme/                 // Material 3 theme, dark mode
          today/TodayScreen.kt + ViewModel
          meds/MedListScreen.kt + MedEditScreen.kt + ViewModels
          history/HistoryScreen.kt + ViewModel
          nav/NavGraph.kt
      res/                       // icons, strings, notification channel names
      AndroidManifest.xml
    build.gradle.kts
  gradle/libs.versions.toml
  settings.gradle.kts
  build.gradle.kts
  .github/workflows/android.yml  // assembleDebug + test
  README.md
```

One Gradle module. No feature modules — overkill at this size.

## Data model

Room entities:

- `Medication(id, name, dosageText, pillsPerDose, currentPills, lowSupplyThreshold, times: List<LocalTime> (TypeConverter), createdAt, archivedAt?)`
- `DoseLog(id, medId FK, scheduledFor: Instant, actedAt: Instant, status: TAKEN|SKIPPED|SNOOZED, pillsConsumed)`

Indexes on `DoseLog.medId` and `DoseLog.scheduledFor`. `Instant` and `LocalTime` stored as ISO strings via TypeConverters.

## Reminder engine

- On med save: compute upcoming fire times for the next 48 h, schedule one `PendingIntent` per (medId, scheduledFor) with `AlarmManager.setExactAndAllowWhileIdle`.
- `ReminderReceiver` posts a notification with two actions:
  - Taken → `ActionReceiver` inserts `DoseLog`, decrements `currentPills`, cancels notification.
  - Snooze 10 min → reschedules a single alarm at `now + 10 min`.
- After firing, the receiver schedules the next occurrence for that med.
- `BootReceiver` (BOOT_COMPLETED) walks all active meds and reschedules the next 48 h window.
- On Android 12+, request `SCHEDULE_EXACT_ALARM` (or fall back to `setAndAllowWhileIdle` if denied) and surface a settings deep-link in a small banner.
- One `NotificationChannel` (`reminders`, importance HIGH) created in `Application.onCreate`.

## UI

Three top-level destinations in a bottom nav: Today, Meds, History. Compose Navigation with typed routes. Edit / new med is a full-screen route pushed from Meds.

Theme: Material 3, system dark mode, no custom dynamic color for v1 (keeps look consistent across OEM skins).

## Performance and leanness rules

- No reflection-based JSON. No Gson / Moshi in v1 (nothing to serialize outside Room).
- No image loading library — icons are vector drawables shipped in `res/drawable`.
- R8 full mode enabled for release, resource shrinking on.
- Baseline profile added once the UI stabilizes (post v1 optional).
- Single `Activity`, no fragments.

## Failure-surface reduction

- One dependency per concern (see table). No overlapping libraries.
- No network code → no TLS / retry / offline logic to get wrong.
- All time math in one file (`domain/Schedule.kt`) with unit tests.
- All alarm scheduling in one file (`notifications/Reminders.kt`) with instrumentation tests for a happy-path fire + Taken action.
- Migrations: start at Room schema v1, export schema to `app/schemas/` from day one so future migrations are diffable.

## Milestones

1. Bootstrap repo: Gradle, Compose, Room, Navigation, Material 3, CI. Empty app launches to Today.
2. Meds CRUD + Today (in-memory schedule preview, no alarms yet).
3. AlarmManager + notification channel + Taken/Snooze actions + Boot receiver.
4. History screen + undo.
5. Dark theme polish, exact-alarm permission UX, R8, README with build/run instructions.

## What I need from you before starting

- Confirm the package id — proposal: `app.pillshere` (drops the `lovable` segment since it's a new repo).
- Confirm minSdk 26 is fine (drops Android 7 and older, ~3% of devices globally, near-zero in practice for a new install).

If both are yes, I'll scaffold the new repo per the layout above and drive it milestone by milestone.
