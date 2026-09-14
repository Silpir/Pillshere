// Platform helpers. The Capacitor WebView build has been retired; these
// remain as no-ops so the legacy web reference build keeps compiling.

export function isCapacitorAndroid(): boolean {
  return false;
}

export function isNative(): boolean {
  return false;
}

export function clearAndroidInteractionLocks(): void {
  // No-op without the Android WebView shell.
}
