import { format, parseISO } from "date-fns";
import type { z } from "zod";
import type { appStateSchema } from "./schemas";

export function renderTextReport(state: z.infer<typeof appStateSchema>): string {
  const lines: string[] = [];
  lines.push("Prozume — Medication history");
  lines.push(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`);
  lines.push("");
  lines.push(`Medications (${state.medications.length}):`);
  for (const m of state.medications) {
    lines.push(
      `  • ${m.name}  —  ${m.pillsPerDose} pill/dose  —  ${m.supply.currentPills}/${m.supply.originalQty} on hand`,
    );
  }
  lines.push("");
  lines.push(`Dose log (${state.doseLog.length}):`);
  const doses = [...state.doseLog].sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor));
  for (const d of doses) {
    const med = state.medications.find((m) => m.id === d.medId);
    lines.push(
      `  ${format(parseISO(d.scheduledFor), "yyyy-MM-dd HH:mm")}  ${d.status.padEnd(7)}  ${med?.name ?? d.medId}`,
    );
  }
  lines.push("");
  lines.push(`Refill log (${state.refillLog.length}):`);
  for (const r of [...state.refillLog].reverse()) {
    const med = state.medications.find((m) => m.id === r.medId);
    lines.push(
      `  ${format(parseISO(r.at), "yyyy-MM-dd")}  +${r.pillsAdded} pills  ${med?.name ?? r.medId}`,
    );
  }
  return lines.join("\n") + "\n";
}