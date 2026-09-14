// Local notification scheduling was handled by Capacitor LocalNotifications,
// which has been removed along with the retired WebView Android build.
// These remain as no-ops so the legacy web reference build keeps compiling.

export async function initNotifications(): Promise<void> {
  // No-op: no native notification bridge.
}

export async function syncReminders(): Promise<void> {
  // No-op: no native notification bridge.
}
