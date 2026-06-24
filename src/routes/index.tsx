import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import { Check, Clock, Pill, Undo2, X, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { actions, useAppState } from "@/lib/medications/store";
import {
  daysOfSupplyRemaining,
  isLowSupply,
  scheduledTimesForDay,
} from "@/lib/medications/schedule";
import type { DoseLogEntry, Medication } from "@/lib/medications/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — MedTrack" },
      { name: "description", content: "Today's medication doses with quick check-off and supply alerts." },
      { property: "og:title", content: "Today — MedTrack" },
      { property: "og:description", content: "Today's medication doses with quick check-off and supply alerts." },
    ],
  }),
  component: TodayPage,
});

type DoseInstance = {
  key: string;
  med: Medication;
  scheduledFor: string;
  entry?: DoseLogEntry;
};

function TodayPage() {
  const { medications, doseLog } = useAppState();
  const now = new Date();

  const instances = useMemo<DoseInstance[]>(() => {
    const today = new Date();
    const out: DoseInstance[] = [];
    for (const med of medications) {
      if (med.archivedAt) continue;
      for (const t of scheduledTimesForDay(med, today)) {
        const iso = t.toISOString();
        const entry = doseLog.find(
          (d) => d.medId === med.id && d.scheduledFor === iso,
        );
        out.push({ key: `${med.id}-${iso}`, med, scheduledFor: iso, entry });
      }
    }
    return out.sort(
      (a, b) => parseISO(a.scheduledFor).getTime() - parseISO(b.scheduledFor).getTime(),
    );
  }, [medications, doseLog]);

  const overdue = instances.filter(
    (i) => !i.entry && parseISO(i.scheduledFor) <= now,
  );
  const upcoming = instances.filter(
    (i) => !i.entry && parseISO(i.scheduledFor) > now,
  );
  const done = instances.filter((i) => i.entry);

  const prn = medications.filter((m) => !m.archivedAt && m.schedule.kind === "prn");

  const lowMeds = medications.filter((m) => !m.archivedAt && isLowSupply(m));

  const lastTakenMap = useMemo(() => {
    const map = new Map<string, DoseLogEntry>();
    for (const e of doseLog) {
      if (e.status !== "taken" || !e.actedAt) continue;
      const prev = map.get(e.medId);
      if (!prev || (prev.actedAt && e.actedAt > prev.actedAt)) map.set(e.medId, e);
    }
    return map;
  }, [doseLog]);

  function recordWithUndo(medId: string, scheduledFor: string, status: "taken" | "skipped") {
    const entry = actions.recordDose({ medId, scheduledFor, status });
    const med = medications.find((m) => m.id === medId);
    toast(
      status === "taken"
        ? `${med?.name} marked taken`
        : `${med?.name} skipped`,
      {
        action: {
          label: "Undo",
          onClick: () => actions.undoDose(entry.id),
        },
        duration: 5000,
      },
    );
    if (status === "taken" && med) {
      const updated = { ...med, supply: { ...med.supply, currentPills: med.supply.currentPills - med.pillsPerDose } };
      if (isLowSupply(updated)) {
        toast.warning(`${med.name} is running low — time to refill`, { duration: 6000 });
      }
    }
  }

  if (medications.length === 0) {
    return (
      <AppShell>
        <div className="text-center py-16">
          <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">No medications yet</h1>
          <p className="text-muted-foreground mb-6">Add your first medication to start tracking doses.</p>
          <Button asChild>
            <Link to="/meds/new"><Plus className="h-4 w-4 mr-1" /> Add medication</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Today</h1>
          <p className="text-sm text-muted-foreground">{format(now, "EEEE, MMMM d")}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/meds/new"><Plus className="h-4 w-4 mr-1" /> Add med</Link>
        </Button>
      </div>

      {lowMeds.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Refill needed</AlertTitle>
          <AlertDescription>
            {lowMeds.map((m) => m.name).join(", ")} {lowMeds.length === 1 ? "is" : "are"} running low.{" "}
            <Link to="/meds" className="underline font-medium">Manage</Link>
          </AlertDescription>
        </Alert>
      )}

      {overdue.length > 0 && (
        <Section title="Overdue" tone="destructive">
          {overdue.map((i) => (
            <DoseCard key={i.key} inst={i} lastTaken={lastTakenMap.get(i.med.id)} onAct={recordWithUndo} />
          ))}
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="Upcoming">
          {upcoming.map((i) => (
            <DoseCard key={i.key} inst={i} lastTaken={lastTakenMap.get(i.med.id)} onAct={recordWithUndo} />
          ))}
        </Section>
      )}

      {prn.length > 0 && (
        <Section title="As needed">
          {prn.map((med) => (
            <Card key={med.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: med.color }} />
                  <div>
                    <div className="font-medium">{med.name}</div>
                    <LastTakenLine entry={lastTakenMap.get(med.id)} />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => recordWithUndo(med.id, new Date().toISOString(), "taken")}
                >
                  <Check className="h-4 w-4 mr-1" /> Log dose
                </Button>
              </CardContent>
            </Card>
          ))}
        </Section>
      )}

      {done.length > 0 && (
        <Section title="Done">
          {done.map((i) => (
            <DoseCard key={i.key} inst={i} lastTaken={lastTakenMap.get(i.med.id)} onAct={recordWithUndo} />
          ))}
        </Section>
      )}

      {overdue.length === 0 && upcoming.length === 0 && done.length === 0 && prn.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No doses scheduled for today.
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}

function Section({ title, tone, children }: { title: string; tone?: "destructive"; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${tone === "destructive" ? "text-destructive" : "text-muted-foreground"}`}>
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function LastTakenLine({ entry }: { entry?: DoseLogEntry }) {
  if (!entry?.actedAt) return <div className="text-xs text-muted-foreground">Never taken</div>;
  const at = parseISO(entry.actedAt);
  return (
    <div className="text-xs text-muted-foreground">
      Last taken {isToday(at) ? format(at, "h:mm a") : format(at, "MMM d, h:mm a")}
    </div>
  );
}

function DoseCard({
  inst,
  lastTaken,
  onAct,
}: {
  inst: DoseInstance;
  lastTaken?: DoseLogEntry;
  onAct: (medId: string, scheduledFor: string, status: "taken" | "skipped") => void;
}) {
  const time = parseISO(inst.scheduledFor);
  const isDone = !!inst.entry;
  const status = inst.entry?.status;
  return (
    <Card className={isDone ? "opacity-70" : ""}>
      <CardContent className="flex items-center justify-between py-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: inst.med.color }} />
          <div className="min-w-0">
            <div className="font-medium truncate">{inst.med.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(time, "h:mm a")} · {inst.med.pillsPerDose} pill{inst.med.pillsPerDose === 1 ? "" : "s"}
            </div>
            {!isDone && lastTaken && <LastTakenLine entry={lastTaken} />}
          </div>
        </div>
        {isDone ? (
          <div className="flex items-center gap-2">
            <Badge variant={status === "taken" ? "default" : "secondary"}>
              {status === "taken" ? `Taken ${inst.entry?.actedAt ? format(parseISO(inst.entry.actedAt), "h:mm a") : ""}` : "Skipped"}
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => inst.entry && actions.undoDose(inst.entry.id)}
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => onAct(inst.med.id, inst.scheduledFor, "skipped")}>
              <X className="h-4 w-4 mr-1" /> Skip
            </Button>
            <Button size="sm" onClick={() => onAct(inst.med.id, inst.scheduledFor, "taken")}>
              <Check className="h-4 w-4 mr-1" /> Taken
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}