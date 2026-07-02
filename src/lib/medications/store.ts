import { useSyncExternalStore } from "react";
import type {
  AppState,
  DoseLogEntry,
  DoseStatus,
  Medication,
  RefillLogEntry,
} from "./types";
import { appStateSchema } from "./schemas";

const STORAGE_KEY = "med-reminder-v1";

const EMPTY_STATE: AppState = {
  medications: [],
  doseLog: [],
  refillLog: [],
};

let state: AppState = EMPTY_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      state = {
        medications: parsed.medications ?? [],
        doseLog: parsed.doseLog ?? [],
        refillLog: parsed.refillLog ?? [],
      };
    }
  } catch (e) {
    console.error("Failed to load med state", e);
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to persist med state", e);
  }
}

function setState(next: AppState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  load();
  return state;
}

function getServerSnapshot() {
  return EMPTY_STATE;
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const actions = {
  addMedication(med: Omit<Medication, "id" | "createdAt">): Medication {
    const created: Medication = {
      ...med,
      id: uid(),
      createdAt: new Date().toISOString(),
    };
    setState({ ...state, medications: [...state.medications, created] });
    return created;
  },

  updateMedication(id: string, patch: Partial<Medication>) {
    setState({
      ...state,
      medications: state.medications.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      ),
    });
  },

  archiveMedication(id: string) {
    actions.updateMedication(id, { archivedAt: new Date().toISOString() });
  },

  unarchiveMedication(id: string) {
    actions.updateMedication(id, { archivedAt: undefined });
  },

  deleteMedication(id: string) {
    setState({
      medications: state.medications.filter((m) => m.id !== id),
      doseLog: state.doseLog.filter((d) => d.medId !== id),
      refillLog: state.refillLog.filter((r) => r.medId !== id),
    });
  },

  recordDose(input: {
    medId: string;
    scheduledFor: string;
    status: DoseStatus;
    note?: string;
  }): DoseLogEntry {
    const med = state.medications.find((m) => m.id === input.medId);
    const pillsConsumed =
      input.status === "taken" && med ? med.pillsPerDose : 0;
    const entry: DoseLogEntry = {
      id: uid(),
      medId: input.medId,
      scheduledFor: input.scheduledFor,
      status: input.status,
      actedAt: new Date().toISOString(),
      note: input.note,
      pillsConsumed,
    };
    let medications = state.medications;
    if (pillsConsumed > 0 && med) {
      medications = state.medications.map((m) =>
        m.id === med.id
          ? {
              ...m,
              supply: {
                ...m.supply,
                currentPills: Math.max(0, m.supply.currentPills - pillsConsumed),
              },
            }
          : m,
      );
    }
    setState({ ...state, medications, doseLog: [...state.doseLog, entry] });
    return entry;
  },

  undoDose(entryId: string) {
    const entry = state.doseLog.find((d) => d.id === entryId);
    if (!entry) return;
    let medications = state.medications;
    if (entry.pillsConsumed && entry.pillsConsumed > 0) {
      medications = state.medications.map((m) =>
        m.id === entry.medId
          ? {
              ...m,
              supply: {
                ...m.supply,
                currentPills: m.supply.currentPills + (entry.pillsConsumed ?? 0),
              },
            }
          : m,
      );
    }
    setState({
      ...state,
      medications,
      doseLog: state.doseLog.filter((d) => d.id !== entryId),
    });
  },

  recordRefill(input: { medId: string; pillsAdded: number; note?: string }) {
    const entry: RefillLogEntry = {
      id: uid(),
      medId: input.medId,
      at: new Date().toISOString(),
      pillsAdded: input.pillsAdded,
      note: input.note,
    };
    const medications = state.medications.map((m) =>
      m.id === input.medId
        ? {
            ...m,
            supply: {
              ...m.supply,
              currentPills: m.supply.currentPills + input.pillsAdded,
              refillsRemaining:
                m.supply.refillsRemaining != null && m.supply.refillsRemaining > 0
                  ? m.supply.refillsRemaining - 1
                  : m.supply.refillsRemaining,
            },
          }
        : m,
    );
    setState({
      ...state,
      medications,
      refillLog: [...state.refillLog, entry],
    });
  },

  adjustPillCount(medId: string, newCount: number) {
    const medications = state.medications.map((m) =>
      m.id === medId
        ? { ...m, supply: { ...m.supply, currentPills: Math.max(0, newCount) } }
        : m,
    );
    setState({ ...state, medications });
  },

  exportJson(): string {
    return JSON.stringify(state, null, 2);
  },

  importJson(raw: string) {
    // Never trust an imported file: parse JSON, then schema-validate every
    // field. Rejects extra keys, bad types, malformed dates/colors/ids, and
    // oversized strings/arrays — preventing tampered exports from poisoning
    // state or smuggling unexpected fields into rendered output.
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error("File is not valid JSON");
    }
    const result = appStateSchema.safeParse(json);
    if (!result.success) {
      throw new Error("File is not a valid Pillshere export");
    }
    setState({
      medications: result.data.medications,
      doseLog: result.data.doseLog,
      refillLog: result.data.refillLog,
    });
  },

  reset() {
    setState(EMPTY_STATE);
  },
};