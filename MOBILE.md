# Pillshere — Android build

Pillshere wraps the web app in [Capacitor](https://capacitorjs.com/) for Android.
All data stays on-device (localStorage); no backend is required.

## One-time setup

```bash
bun install
bun run build           # produces .output/public (the web bundle Capacitor packages)
bunx cap add android    # only the first time — creates the android/ native project
bunx cap sync android
bunx cap open android   # opens Android Studio
```

From Android Studio, **Run** on an emulator or USB-connected phone.

## After each code change

```bash
bun run build && bunx cap sync android
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