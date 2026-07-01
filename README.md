# Prozume

Lightweight, local-first medication reminder & adherence tracker.
All data lives in your browser (or on your device on Android) — no accounts,
no backend, no cloud sync.

## Features

- Multiple medications with flexible schedules (daily, weekdays, every N days, PRN)
- Pill supply tracking with refill reminders
- Dose history, adherence stats, streaks
- Export as JSON or plain text, or email a snapshot
- Light / dark / system theme
- Native Android build with local notifications (Taken / Snooze actions)

## Web development

```bash
bun install
bun run dev       # start dev server
bun run build     # production build (.output/public)
```

## Android app

Prozume ships as a native Android app via [Capacitor](https://capacitorjs.com/).
Same web UI, same local data — with OS-level notifications that fire even when
the app is closed.

### Prerequisites

- [Android Studio](https://developer.android.com/studio) (latest stable)
- JDK 17+
- An Android emulator or a USB-connected device with USB debugging enabled

### One-time setup

```bash
bun install
bun run build            # builds the web bundle Capacitor packages (.output/public)
npx cap add android      # first time only — generates the android/ native project
npx cap sync android     # copies the web build + plugins into the native project
npx cap open android     # opens Android Studio
```

In Android Studio, click **Run** to launch on an emulator or the connected device.

### After each code change

```bash
bun run build && npx cap sync android
```

Then hit Run in Android Studio again.

### Local notifications

On first launch, the app asks for notification permission. Reminders are
scheduled natively and fire even when the app is closed. Each reminder shows:

- **Taken** — logs the dose and decrements your pill supply
- **Snooze 10 min** — re-fires the reminder in 10 minutes

On the web build these are a no-op (in-app toasts only).

### Publishing to the Play Store

1. Open the project in Android Studio.
2. Build → **Generate Signed Bundle / APK** → choose **Android App Bundle**.
3. Create or select a signing key, then follow the wizard.
4. Upload the resulting `.aab` in the Play Console.

The package id is `app.lovable.prozume`. Change it in `capacitor.config.ts`
**before your first publish** if you want a different identifier.

### Data ownership

All medication and history data is stored on-device (localStorage inside the
WebView). Uninstalling the app deletes the data. Use **History → Data → Export**
to back it up before switching devices or reinstalling.

## Security

- Every server response (including file downloads) sets CSP, X-Content-Type-Options,
  X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS, COOP, and DNS-prefetch controls.
- All form input is validated with Zod; imports are re-validated against the same schema.
- Automated CI scans run `bun audit`, `npm audit`, OSV Scanner, CodeQL, and Gitleaks
  on every push and weekly.

## License

Personal / private use.