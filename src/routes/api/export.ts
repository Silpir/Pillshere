import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { appStateSchema } from "@/lib/medications/schemas";
import { renderTextReport } from "@/lib/medications/report";

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
              "Content-Disposition": `attachment; filename="pillshere-${stamp}.txt"`,
              "Cache-Control": "no-store",
            },
          });
        }
        return new Response(JSON.stringify(state, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="pillshere-${stamp}.json"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});

type Parsed =
  | { ok: true; state: Parameters<typeof renderTextReport>[0]; fmt: "json" | "text" }
  | { ok: false; error: string };

function z_parseWrapper(body: unknown): Parsed {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  const { format: fmt, state } = body as { format?: string; state?: unknown };
  if (fmt !== "json" && fmt !== "text") return { ok: false, error: "Invalid format" };
  const result = appStateSchema.safeParse(state);
  if (!result.success) return { ok: false, error: "Invalid state" };
  return { ok: true, state: result.data, fmt };
}