import { Capacitor } from "@capacitor/core";

export function isCapacitorAndroid(): boolean {
  if (typeof window === "undefined") return false;

  if (import.meta.env.VITE_CAPACITOR_PLATFORM === "android") return true;

  try {
    if (Capacitor.getPlatform() === "android") return true;
    if (Capacitor.isNativePlatform() && /Android/i.test(navigator.userAgent)) return true;
  } catch {
    // Fall through to bridge/user-agent checks below.
  }

  const win = window as unknown as {
    androidBridge?: unknown;
    Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean };
  };
  const ua = navigator.userAgent;

  return (
    win.androidBridge != null ||
    win.Capacitor?.getPlatform?.() === "android" ||
    (win.Capacitor?.isNativePlatform?.() === true && /Android/i.test(ua)) ||
    (/Android/i.test(ua) && /; wv\)|Version\/\d+(?:\.\d+)? Chrome\//i.test(ua))
  );
}

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.VITE_CAPACITOR_PLATFORM) return true;

  try {
    return Capacitor.getPlatform() !== "web";
  } catch {
    return false;
  }
}

export function clearAndroidInteractionLocks(): void {
  if (!isCapacitorAndroid()) return;

  const body = document.body;
  const root = document.documentElement;
  body.style.removeProperty("pointer-events");
  body.style.removeProperty("overflow");
  body.style.removeProperty("position");
  body.style.removeProperty("touch-action");
  root.style.removeProperty("pointer-events");
  root.style.removeProperty("overflow");

  body.removeAttribute("data-scroll-locked");
}