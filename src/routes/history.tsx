import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  eachDayOfInterval,
  endOfDay,
  format,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { Download, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { actions, useAppState } from "@/lib/medications/store";
import { scheduledTimesForDay } from "@/lib/medications/schedule";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History & stats — MedTrack" },
      { name: "description", content: "Dose history, adherence, streaks, and refill log." },
      { property: "og:title", content: "History & stats — MedTrack" },
      { property: "og:description", content: "Dose history, adherence, streaks, and refill log." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const state = useAppState();
  const { medications, doseLog, refillLog } = state;
  const fileRef = useRef<HTMLInputElement>(null);

  const now = new Date();

  // Mark missed doses for all past scheduled times that have no entry.
  const allInstances = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(now, 29), end: now });
    const out: { medId: string; medName: string; color: string; scheduledFor: Date; entry?: typeof doseLog[number] }[] = [];
    for (const med of medications) {
      for (const day of days) {
        for (const t of scheduledTimesForDay(med, day)) {
          if (t > now) continue;
          const iso = t.toISOString();
          const entry = doseLog.find((d) => d.medId === med.id && d.scheduledFor === iso);
          out.push({ medId: med.id, medName: med.name, color: med.color, scheduledFor: t, entry });
        }
      }
    }
    return out;
  }, [medications, doseLog]);

  // Stats
  const taken = allInstances.filter((i) => i.entry?.status === "taken").length;
  const skipped = allInstances.filter((i) => i.entry?.status === "skipped").length;
  // Missed = past instance with no entry, but only those before today's end of day
  const missed = allInstances.filter(
    (i) => !i.entry && i.scheduledFor < startOfDay(now),
  ).length;
  const totalActed = taken + skipped + missed;
  const adherence = totalActed > 0 ? Math.round((taken / totalActed) * 100) : 0;

  // Streak: consecutive days (ending today or yesterday) with 100% taken
  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const day = startOfDay(subDays(now, i));
      const dayEnd = endOfDay(day);
      const dayInstances: { entry?: typeof doseLog[number] }[] = [];
      for (const med of medications) {
        for (const t of scheduledTimesForDay(med, day)) {
          if (t > now) continue;
          const iso = t.toISOString();
          const entry = doseLog.find((d) => d.medId === med.id && d.scheduledFor === iso);
          dayInstances.push({ entry });
        }
      }
      if (dayInstances.length === 0) {
        if (i === 0) continue;
        break;
      }
      const allTaken = dayInstances.every((d) => d.entry?.status === "taken");
      if (allTaken) s++;
      else break;
    }
    return s;
  }, [medications, doseLog]);

  // Weekly heatmap data (last 14 days)
  const heatDays = eachDayOfInterval({ start: subDays(now, 13), end: now });

  // Doses sorted desc for table
  const rows = useMemo(() => {
    const items = allInstances.map((i) => ({
      ...i,
      status: i.entry?.status ?? (i.scheduledFor < startOfDay(now) ? "missed" : "pending"),
    }));
    items.sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime());
    return items.slice(0, 200);
  }, [allInstances]);

  function handleExport() {
    const blob = new Blob([actions.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medtrack-${format(now, "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        actions.importJson(String(reader.result));
        toast.success("Imported");
      } catch {
        toast.error("Invalid file");
      }
    };
    reader.readAsText(file);
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold mb-6">History & stats</h1>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Adherence (30d)" value={`${adherence}%`} />
        <StatCard label="Streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
        <StatCard label="Doses taken (30d)" value={String(taken)} />
      </div>

      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="text-sm font-medium mb-3">Last 14 days</div>
          <div className="flex gap-1">
            {heatDays.map((day) => {
              const dayInstances = allInstances.filter(
                (i) => format(i.scheduledFor, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
              );
              const tk = dayInstances.filter((i) => i.entry?.status === "taken").length;
              const total = dayInstances.length;
              const pct = total === 0 ? null : tk / total;
              const bg =
                pct == null
                  ? "bg-muted"
                  : pct === 1
                  ? "bg-green-500"
                  : pct >= 0.5
                  ? "bg-yellow-500"
                  : pct > 0
                  ? "bg-orange-500"
                  : "bg-destructive";
              return (
                <div key={day.toISOString()} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full aspect-square rounded ${bg}`} title={`${tk}/${total} taken`} />
                  <span className="text-[10px] text-muted-foreground">{format(day, "d")}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="doses">
        <TabsList>
          <TabsTrigger value="doses">Dose log</TabsTrigger>
          <TabsTrigger value="refills">Refill log</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        <TabsContent value="doses">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Medication</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        No doses yet
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{format(r.scheduledFor, "MMM d")}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                          {r.medName}
                        </span>
                      </TableCell>
                      <TableCell>{format(r.scheduledFor, "h:mm a")}</TableCell>
                      <TableCell>
                        <StatusPill status={r.status} actedAt={r.entry?.actedAt} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="refills">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Medication</TableHead>
                    <TableHead className="text-right">Pills added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refillLog.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        No refills logged
                      </TableCell>
                    </TableRow>
                  )}
                  {[...refillLog].reverse().map((r) => {
                    const med = medications.find((m) => m.id === r.medId);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{format(parseISO(r.at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{med?.name ?? "—"}</TableCell>
                        <TableCell className="text-right">+{r.pillsAdded}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="data">
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" /> Export JSON
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Import JSON
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImport(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Delete ALL medications and history? This cannot be undone.")) {
                      actions.reset();
                      toast.success("All data cleared");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Reset all
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your data is stored only in this browser. Export to back it up or move to another device.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status, actedAt }: { status: string; actedAt?: string }) {
  const cls =
    status === "taken"
      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
      : status === "skipped"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
      : status === "missed"
      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      : "bg-muted text-muted-foreground";
  const label = status === "taken" && actedAt
    ? `Taken ${format(parseISO(actedAt), "h:mm a")}`
    : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`inline-block px-2 py-0.5 rounded text-xs ${cls}`}>{label}</span>;
}