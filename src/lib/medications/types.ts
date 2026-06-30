export type ScheduleKind = "daily" | "weekdays" | "every_n_days" | "prn";

export type Schedule =
  | { kind: "daily"; times: string[]; startDate?: string } // times "HH:MM", startDate "YYYY-MM-DD"
  | { kind: "weekdays"; weekdays: number[]; times: string[]; startDate?: string } // 0=Sun..6=Sat
  | { kind: "every_n_days"; everyN: number; startDate: string; times: string[] }
  | { kind: "prn" };

export type RefillThreshold =
  | { type: "days"; value: number }
  | { type: "pills"; value: number };

export interface Supply {
  originalQty: number;
  currentPills: number;
  refillThreshold: RefillThreshold;
  refillsRemaining?: number;
}

export interface Medication {
  id: string;
  name: string;
  color: string;
  pillsPerDose: number;
  schedule: Schedule;
  supply: Supply;
  createdAt: string;
  archivedAt?: string;
}

export type DoseStatus = "taken" | "skipped" | "missed";

export interface DoseLogEntry {
  id: string;
  medId: string;
  scheduledFor: string; // ISO datetime — for PRN, the time it was logged
  status: DoseStatus;
  actedAt?: string;
  note?: string;
  pillsConsumed?: number;
}

export interface RefillLogEntry {
  id: string;
  medId: string;
  at: string;
  pillsAdded: number;
  note?: string;
}

export interface AppState {
  medications: Medication[];
  doseLog: DoseLogEntry[];
  refillLog: RefillLogEntry[];
}

export const MED_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
] as const;