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