# Pillshere

I'm horrible at taking pills regularly, so I needed some help with reminders and refills. 
This is a personal experiment with making something with local LLM and Cline agentic coding setup. 
All data lives on-device and there's no cloud components.

> The web/Capacitor build has been retired. The app is now a native Android
> project under [`android-native/`](./android-native). Legacy web sources in
> `src/` remain only as reference and are not shipped.

## TO-DO

- Clean up all legacy web/capacity build leftovers
- Better UI
- Simpler confirmation with working alarm system
- Android notification integration
- More automation with refill
- Better statistics & history visualisation

## Features

- Medications CRUD with flexible schedules and start dates
- **Today** screen showing scheduled doses for the day with action buttons
- **History** screen showing the full adherence log
- Compact day-by-day timeline on Today with filters: **All / Taken / Skipped / Snoozed**
- Tap a timeline row to see exact timestamp, scheduled dose time, and snooze-until time
- Confirmation prompt on the **Taken** button to cancel accidental taps
- Double-tap prevention: warns if the same medication was already recorded as taken recently
- Visual "Taken today" highlight on a dose after it is recorded
- Dynamic dose cards that expand to fill the screen when only 1–2 are due
- Local notifications with **Taken** and **Snooze 10 min** actions (fire even when the app is closed, survive reboots)
- Missed-dose reminder notifications that include the medication name and scheduled HH:MM time
- Light / dark theme following the system
- Local JSON export/import of all medications and dose history through Android's Storage Access Framework

## Stack

- Kotlin 2.0, Jetpack Compose, Material 3
- Single-activity, MVVM (`ViewModel` + `StateFlow`)
- Room (SQLite) for meds + dose log, DataStore for preferences
- `AlarmManager` + `BroadcastReceiver` for reminders (no Play Services)
- Manual DI via `AppContainer` — no Hilt/Koin
- `minSdk 26`, `targetSdk 35`

## Build locally

Prerequisites: **JDK 17** and **Android SDK (API 35)**. Android Studio Koala
or newer is optional — you can build from the command line once the SDK is
installed.

The Gradle wrapper is included in the repo, so you do **not** need a system-wide
Gradle installation.

### 1. Verify your Android SDK is configured

Run the pre-flight check from the project root. It will tell you exactly what
to fix before Gradle throws a cryptic error:

```bash
node scripts/check-android-env.mjs
```

### 2. Tell Gradle where your Android SDK is

Gradle needs either an `ANDROID_HOME` environment variable pointing to the SDK,
or a `local.properties` file inside `android-native/`. **This step is required** —
the build will fail with `FileNotFoundException: local.properties` if you skip it.

If you see **"SDK location not found"**, do one of the following:

**Option A — environment variable (works on all platforms):**

- Windows (PowerShell): `$env:ANDROID_HOME = "C:\Users\<you>\AppData\Local\Android\Sdk"`
- Windows (cmd.exe): `set ANDROID_HOME=C:\Users\<you>\AppData\Local\Android\Sdk`
- macOS/Linux: `export ANDROID_HOME=$HOME/Library/Android/sdk` (macOS) or
  `$HOME/Android/Sdk` (Linux).

**Option B — `local.properties` file (recommended for Windows users):**

Create `android-native/local.properties` with exactly this line, using forward
slashes or double backslashes:

```properties
sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk
```

Replace `<you>` with your actual Windows user name. If you installed Android
Studio, confirm the exact path under **Settings → Languages & Frameworks → Android SDK**.

> `local.properties` is already gitignored, so it will not be committed.

### 3. Build the APK

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
app deletes the data. Use **History → Export backup** to save a JSON file
before wiping or switching devices, then restore it later with **History → Import backup**.

## License

Personal / private use.
