import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { appStateSchema } from "@/lib/medications/schemas";

// Server-side export endpoint. Runs behind securityHeadersMiddleware
// (see src/start.ts), so every download response carries CSP,
// X-Content-Type-Options, X-Frame-Options, Referrer-Policy, etc.
// The client posts its localStorage state; we validate it, format it,
// and stream it back with a safe Content-Type + Content-Disposition.
export const Route = createFileRoute("/api/export")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          const text = await request.text();
          if (text.length > 5 * 1024 * 1024) {
            return new Response("Payload too large", { status: 413 });
          }
          body = JSON.parse(text);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = z_parseWrapper(body);
        if (!parsed.ok) {
          return new Response(parsed.error, { status: 400 });
        }
        const { state, fmt } = parsed;

        const stamp = format(new Date(), "yyyy-MM-dd");
        if (fmt === "text") {
          const text = renderTextReport(state);
          return new Response(text, {
            status: 200,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Content-Disposition": `attachment; filename="prozume-${stamp}.txt"`,
              "Cache-Control": "no-store",
            },
          });
        }
        return new Response(JSON.stringify(state, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="prozume-${stamp}.json"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});

type ParsedOk = { ok: true; state: import("zod").infer<typeof appStateSchema>; fmt: "json" | "text" };
type ParsedErr = { ok: false; error: string };

function z_parseWrapper(body: unknown): ParsedOk | ParsedErr {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  const { format: fmt, state } = body as { format?: string; state?: unknown };
  if (fmt !== "json" && fmt !== "text") return { ok: false, error: "Invalid format" };
  const result = appStateSchema.safeParse(state);
  if (!result.success) return { ok: false, error: "Invalid state" };
  return { ok: true, state: result.data, fmt };
}

export function renderTextReport(state: import("zod").infer<typeof appStateSchema>): string {
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