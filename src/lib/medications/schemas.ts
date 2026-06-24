import { z } from "zod";

const timeStr = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)");

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
    startDate: z.string().min(1, "Pick a start date"),
    times: z.array(timeStr).min(1, "Add at least one time"),
  }),
  z.object({ kind: z.literal("prn") }),
]);

export const medFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  color: z.string().regex(/^#([0-9a-f]{6})$/i),
  pillsPerDose: z.number().min(0.25).max(20),
  schedule: scheduleSchema,
  originalQty: z.number().int().min(0).max(10000),
  currentPills: z.number().int().min(0).max(10000),
  refillThresholdType: z.enum(["days", "pills"]),
  refillThresholdValue: z.number().min(0).max(365),
  refillsRemaining: z.number().int().min(0).max(99).optional(),
});

export type MedFormValues = z.infer<typeof medFormSchema>;