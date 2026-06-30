import { eachDayOfInterval, addDays } from "date-fns";
import { isNative } from "./platform";
import { scheduledTimesForDay } from "@/lib/medications/schedule";
import type { AppState, DoseLogEntry, Medication } from "@/lib/medications/types";
import { actions } from "@/lib/medications/store";

const ACTION_TYPE_ID = "MED_REMINDER";
const HORIZON_DAYS = 14;

// Deterministic 31-bit positive int from medId + scheduledFor ISO string.
// Local Notifications requires integer IDs and we want re-syncs to overwrite
// rather than duplicate.
function notifId(medId: string, iso: string): number {
  const s = `${medId}|${iso}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h & 0x7fffffff;
}

let initialized = false;
let permissionGranted = false;

export async function initNotifications(): Promise<void> {
  if (!isNative() || initialized) return;
  initialized = true;
  const { LocalNotifications } = await import("@capacitor/local-notifications");

  // Register Taken / Snooze action buttons once.
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: ACTION_TYPE_ID,
          actions: [
            { id: "TAKEN", title: "Taken" },
            { id: "SNOOZE", title: "Snooze 10 min" },
          ],
        },
      ],
    });
  } catch (e) {
    console.warn("registerActionTypes failed", e);
  }

  const perm = await LocalNotifications.checkPermissions();
  if (perm.display === "granted") {
    permissionGranted = true;
  } else if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
    const req = await LocalNotifications.requestPermissions();
    permissionGranted = req.display === "granted";
  }

  await LocalNotifications.addListener(
    "localNotificationActionPerformed",
    async (event) => {
      const extra = (event.notification.extra ?? {}) as {
        medId?: string;
        scheduledFor?: string;
      };
      if (!extra.medId || !extra.scheduledFor) return;
      if (event.actionId === "TAKEN") {
        actions.recordDose({
          medId: extra.medId,
          scheduledFor: extra.scheduledFor,
          status: "taken",
        });
      } else if (event.actionId === "SNOOZE") {
        const at = new Date(Date.now() + 10 * 60 * 1000);
        const id = notifId(extra.medId, at.toISOString());
        try {
          await LocalNotifications.schedule({
            notifications: [
              {
                id,
                title: event.notification.title ?? "Medication reminder",
                body: event.notification.body ?? "",
                schedule: { at, allowWhileIdle: true },
                actionTypeId: ACTION_TYPE_ID,
                extra,
              },
            ],
          });
        } catch (e) {
          console.warn("snooze schedule failed", e);
        }
      }
    },
  );
}

export async function syncReminders(state: AppState): Promise<void> {
  if (!isNative() || !permissionGranted) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");

  // Cancel all currently pending app reminders so we don't double-schedule.
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
  } catch (e) {
    console.warn("cancel pending failed", e);
  }

  const now = new Date();
  const horizon = addDays(now, HORIZON_DAYS);
  const days = eachDayOfInterval({ start: now, end: horizon });

  type Notif = {
    id: number;
    title: string;
    body: string;
    schedule: { at: Date; allowWhileIdle: boolean };
    actionTypeId: string;
    extra: { medId: string; scheduledFor: string };
  };
  const toSchedule: Notif[] = [];

  for (const med of state.medications as Medication[]) {
    if (med.archivedAt || med.schedule.kind === "prn") continue;
    for (const day of days) {
      for (const t of scheduledTimesForDay(med, day)) {
        if (t <= now) continue;
        const iso = t.toISOString();
        const already = state.doseLog.find(
          (d: DoseLogEntry) => d.medId === med.id && d.scheduledFor === iso,
        );
        if (already) continue;
        toSchedule.push({
          id: notifId(med.id, iso),
          title: `Time for ${med.name}`,
          body: `${med.pillsPerDose} pill${med.pillsPerDose === 1 ? "" : "s"}`,
          schedule: { at: t, allowWhileIdle: true },
          actionTypeId: ACTION_TYPE_ID,
          extra: { medId: med.id, scheduledFor: iso },
        });
      }
    }
  }

  // Plugin caps per-call batch size — chunk defensively.
  for (let i = 0; i < toSchedule.length; i += 50) {
    const batch = toSchedule.slice(i, i + 50);
    try {
      await LocalNotifications.schedule({ notifications: batch });
    } catch (e) {
      console.warn("schedule batch failed", e);
    }
  }
}