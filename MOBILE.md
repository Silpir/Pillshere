# Pillshere — Android build

Pillshere wraps the web app in [Capacitor](https://capacitorjs.com/) for Android.
All data stays on-device (localStorage); no backend is required.

## One-time setup

```bash
bun install
bun run android:add     # builds dist/capacitor/index.html, creates android/, then syncs plugins
bun run android:open    # opens Android Studio
```

From Android Studio, **Run** on an emulator or USB-connected phone.

If Capacitor was started before a successful web build, remove the incomplete native
folder and rerun the script:

```bat
rmdir /s /q android
bun run android:add
bun run android:open
```

This fixes errors about missing `index.html`, `capacitor.settings.gradle`, or
`capacitor.plugins.json`.

### Gradle: "Namespace not specified"

Android Gradle Plugin 8+ requires an explicit `namespace` in
`android/app/build.gradle`. If Capacitor's scaffold omits it, open the file and
ensure the `android { ... }` block starts with:

```gradle
android {
    namespace = "app.lovable.pillshere"
    ...
}
```

Also confirm `android/app/src/main/AndroidManifest.xml` has no `package="..."`
attribute on its root `<manifest>` tag — AGP 8+ forbids setting both. The
`android/` folder is gitignored, so re-apply this edit whenever you delete and
re-scaffold the native project.

`bun run android:add` and `bun run android:sync` end with
`node scripts/patch-android-gradle.mjs` and
`node scripts/verify-android-config.mjs`. The patch step removes Capacitor's
unused generated `flatDir` repository when no Cordova plugin ships local
`.jar`/`.aar` files, avoiding Gradle's metadata warning. The verify step fails
the command if `capacitor.config.ts` (appId / webDir),
`vite.capacitor.config.ts` (outDir), and `android/app/build.gradle` (namespace /
applicationId) drift apart, if `AndroidManifest.xml` still carries a legacy
`package="..."`, or if an unused `flatDir` block returns. Run it manually with
`bun run android:verify`.

### Samsung / Android WebView touch freeze on Add medication

The Capacitor Android build marks the document with `capacitor-android`, forces
Radix/portal scroll locks back to an interactive body, makes the sticky header
static in the native shell, and swaps schedule/refill selects to native
`<select>` controls. After pulling changes, rebuild and reinstall the native app:

```bash
bun run android:sync
```

## After each code change

```bash
bun run android:sync
```

## Local notifications

On first launch the app asks for notification permission. Reminders are
scheduled natively, so they fire even when the app is closed. Each reminder
exposes two action buttons:

- **Taken** — logs the dose and decrements your pill supply
- **Snooze 10 min** — re-fires the same reminder after 10 minutes

On the web build these are a no-op (in-app toasts only).

## Shipping to Play Store

Build a signed AAB from Android Studio (Build → Generate Signed Bundle).
The package id is `app.lovable.pillshere` — change it in `capacitor.config.ts`
before your first publish if you want a different identifier.