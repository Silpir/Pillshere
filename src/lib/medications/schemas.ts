import { z } from "zod";

const timeStr = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)");

const isoDateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
const isoDateTimeStr = z.string().datetime({ offset: true }).or(z.string().datetime());
const colorHex = z.string().regex(/^#([0-9a-f]{6})$/i, "Invalid color");
const safeId = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, "Invalid id");
const safeName = z.string().trim().min(1, "Name is required").max(80);
const safeNote = z.string().trim().max(500).optional();

export const scheduleSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("daily"),
    times: z.array(timeStr).min(1, "Add at least one time"),
  }),
  z.object({
    kind: z.literal("weekdays"),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one day"),
    times: z.array(timeStr).min(1, "Add at least one time"),
  }),
  z.object({
    kind: z.literal("every_n_days"),
    everyN: z.number().int().min(1).max(60),
    startDate: isoDateStr,
    times: z.array(timeStr).min(1, "Add at least one time"),
  }),
  z.object({ kind: z.literal("prn") }),
]);

export const medFormSchema = z.object({
  name: safeName,
  color: colorHex,
  pillsPerDose: z.number().min(0.25).max(20),
  schedule: scheduleSchema,
  originalQty: z.number().int().min(0).max(10000),
  currentPills: z.number().int().min(0).max(10000),
  refillThresholdType: z.enum(["days", "pills"]),
  refillThresholdValue: z.number().min(0).max(365),
  refillsRemaining: z.number().int().min(0).max(99).optional(),
});

export type MedFormValues = z.infer<typeof medFormSchema>;

// --- Dialog-level schemas ---

export const refillSchema = z.object({
  pillsAdded: z.number().int().min(1, "Enter at least 1 pill").max(10000),
  note: safeNote,
});

export const adjustPillsSchema = z.object({
  currentPills: z.number().int().min(0, "Cannot be negative").max(10000),
});

// --- Persisted / imported state schemas ---

const supplySchema = z.object({
  originalQty: z.number().int().min(0).max(10000),
  currentPills: z.number().int().min(0).max(10000),
  refillThreshold: z.discriminatedUnion("type", [
    z.object({ type: z.literal("days"), value: z.number().min(0).max(365) }),
    z.object({ type: z.literal("pills"), value: z.number().int().min(0).max(10000) }),
  ]),
  refillsRemaining: z.number().int().min(0).max(99).optional(),
});

export const medicationSchema = z.object({
  id: safeId,
  name: safeName,
  color: colorHex,
  pillsPerDose: z.number().min(0.25).max(20),
  schedule: scheduleSchema,
  supply: supplySchema,
  createdAt: isoDateTimeStr,
  archivedAt: isoDateTimeStr.optional(),
});

export const doseLogEntrySchema = z.object({
  id: safeId,
  medId: safeId,
  scheduledFor: isoDateTimeStr,
  status: z.enum(["taken", "skipped", "missed"]),
  actedAt: isoDateTimeStr.optional(),
  note: safeNote,
  pillsConsumed: z.number().min(0).max(10000).optional(),
});

export const refillLogEntrySchema = z.object({
  id: safeId,
  medId: safeId,
  at: isoDateTimeStr,
  pillsAdded: z.number().int().min(0).max(10000),
  note: safeNote,
});

export const appStateSchema = z.object({
  medications: z.array(medicationSchema).max(500).default([]),
  doseLog: z.array(doseLogEntrySchema).max(50000).default([]),
  refillLog: z.array(refillLogEntrySchema).max(10000).default([]),
});

export type AppStateValidated = z.infer<typeof appStateSchema>;