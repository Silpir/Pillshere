# Pillshere

Lightweight, local-first medication reminder & adherence tracker for Android.
All data lives on-device (Room / SQLite) — no accounts, no backend, no cloud sync.
Optional Google Drive backup writes a JSON snapshot to a dedicated `Pillshere/`
folder in the user's Drive.

> The web/Capacitor build has been retired. The app is now a native Android
> project under [`android-native/`](./android-native). Legacy web sources in
> `src/` remain only as reference and are not shipped.

## Features (v1)

- Medications CRUD with flexible schedules
- Today + History screens with adherence log
- Local notifications with **Taken** and **Snooze 10 min** actions (fire even
  when the app is closed, survive reboots)
- Light / dark theme following the system
- Optional Google Drive JSON backup into a `Pillshere/` folder

## Stack

- Kotlin 2.0, Jetpack Compose, Material 3
- Single-activity, MVVM (`ViewModel` + `StateFlow`)
- Room (SQLite) for meds + dose log, DataStore for preferences
- `AlarmManager` + `BroadcastReceiver` for reminders (no Play Services)
- Manual DI via `AppContainer` — no Hilt/Koin
- `minSdk 26`, `targetSdk 35`

## Build locally

Prerequisites: **JDK 17**, **Android SDK (API 35)**, and Android Studio Koala
or newer (only if you want the IDE — Gradle alone is enough to produce an APK).

The Gradle wrapper is included in the repo, so you do **not** need a system-wide
Gradle installation.

On macOS / Linux:

```bash
cd android-native
./gradlew assembleDebug          # debug APK
./gradlew assembleRelease        # unsigned release APK
./gradlew installDebug           # install on a connected device/emulator
```

On Windows:

```bat
cd android-native
gradlew.bat assembleDebug
gradlew.bat assembleRelease
gradlew.bat installDebug
```

The first run downloads the Gradle distribution automatically, so it may take a
minute.

Output APKs land in:

```
android-native/app/build/outputs/apk/debug/app-debug.apk
android-native/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Pulling an APK from CI

Every push to `main` triggers the `android.yml` workflow, which runs
`./gradlew assembleDebug` and uploads the resulting APK as a build artifact.

1. Open the repo on GitHub → **Actions** tab.
2. Pick the latest successful **Android native build** run for the commit you want.
3. Scroll to **Artifacts** and download **`pillshere-debug-apk`**.
4. Unzip it — inside is `app-debug.apk`.
5. Transfer to your device and install:

   ```bash
   adb install -r app-debug.apk
   # or copy to the phone and tap it (allow "install from unknown sources")
   ```

Signed release builds for the Play Store are produced locally via
**Android Studio → Build → Generate Signed Bundle / APK** and are not
published as CI artifacts.

## Data ownership

Everything is stored in the app's private Room database. Uninstalling the
app deletes the data. Use **Settings → Backup to Drive** to snapshot to
your Google Drive `Pillshere/` folder before wiping or switching devices.

## License

Personal / private use.
