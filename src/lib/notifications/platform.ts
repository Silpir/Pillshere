import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  try {
    return Capacitor.getPlatform() !== "web";
  } catch {
    return false;
  }
}