import { useEffect } from "react";
import { useAppState } from "@/lib/medications/store";
import { initNotifications, syncReminders } from "@/lib/notifications/scheduler";
import { isNative } from "@/lib/notifications/platform";

/**
 * Boot native local notifications and keep scheduled reminders in sync with
 * the current medication + dose log state. No-op on the web build.
 */
export function useNotificationSync() {
  const state = useAppState();

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;
    (async () => {
      await initNotifications();
      if (!cancelled) await syncReminders(state);
    })();
    return () => {
      cancelled = true;
    };
  }, [state]);
}