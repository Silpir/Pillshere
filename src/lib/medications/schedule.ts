import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Medication, Schedule } from "./types";

function parseTime(t: string, day: Date): Date {
  const [h, m] = t.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

/** All scheduled dose times for a med on a given calendar day. */
export function scheduledTimesForDay(med: Medication, day: Date): Date[] {
  if (med.archivedAt) return [];
  const s = med.schedule;
  if (s.kind === "prn") return [];
  // Respect optional start date — never schedule before it.
  if ("startDate" in s && s.startDate) {
    const start = parseISO(s.startDate);
    if (differenceInCalendarDays(day, start) < 0) return [];
  }
  if (s.kind === "daily") return s.times.map((t) => parseTime(t, day));
  if (s.kind === "weekdays") {
    if (!s.weekdays.includes(day.getDay())) return [];
    return s.times.map((t) => parseTime(t, day));
  }
  if (s.kind === "every_n_days") {
    const start = parseISO(s.startDate);
    const diff = differenceInCalendarDays(day, start);
    if (diff < 0 || s.everyN <= 0 || diff % s.everyN !== 0) return [];
    return s.times.map((t) => parseTime(t, day));
  }
  return [];
}

/** Average pills consumed per day for a med based on its schedule. */
export function averagePillsPerDay(med: Medication): number {
  const s = med.schedule;
  const ppd = med.pillsPerDose;
  if (s.kind === "prn") return 0;
  if (s.kind === "daily") return s.times.length * ppd;
  if (s.kind === "weekdays")
    return (s.weekdays.length * s.times.length * ppd) / 7;
  if (s.kind === "every_n_days")
    return s.everyN > 0 ? (s.times.length * ppd) / s.everyN : 0;
  return 0;
}

export function daysOfSupplyRemaining(med: Medication): number | null {
  const avg = averagePillsPerDay(med);
  if (avg <= 0) return null;
  return med.supply.currentPills / avg;
}

export function isLowSupply(med: Medication): boolean {
  const t = med.supply.refillThreshold;
  if (t.type === "pills") return med.supply.currentPills <= t.value;
  const dos = daysOfSupplyRemaining(med);
  if (dos == null) return false;
  return dos <= t.value;
}

export function describeSchedule(s: Schedule): string {
  if (s.kind === "prn") return "As needed";
  const startSuffix =
    "startDate" in s && s.startDate
      ? ` (from ${format(parseISO(s.startDate), "MMM d, yyyy")})`
      : "";
  if (s.kind === "daily")
    return `Daily at ${s.times.join(", ") || "—"}${startSuffix}`;
  if (s.kind === "weekdays") {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = s.weekdays.map((d) => names[d]).join("/");
    return `${days} at ${s.times.join(", ") || "—"}${startSuffix}`;
  }
  if (s.kind === "every_n_days")
    return `Every ${s.everyN} day${s.everyN === 1 ? "" : "s"} at ${s.times.join(", ") || "—"}${startSuffix}`;
  return "";
}