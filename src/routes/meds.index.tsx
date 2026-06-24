import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, RefreshCcw, Trash2, AlertTriangle, Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actions, useAppState } from "@/lib/medications/store";
import {
  daysOfSupplyRemaining,
  describeSchedule,
  isLowSupply,
} from "@/lib/medications/schedule";
import type { Medication } from "@/lib/medications/types";

export const Route = createFileRoute("/meds/")({
  head: () => ({
    meta: [
      { title: "Medications — Prozume" },
      { name: "description", content: "Manage your medications, schedules, and pill supply." },
      { property: "og:title", content: "Medications — Prozume" },
      { property: "og:description", content: "Manage your medications, schedules, and pill supply." },
    ],
  }),
  component: MedsListPage,
});

function MedsListPage() {
  const { medications } = useAppState();
  const [refillFor, setRefillFor] = useState<Medication | null>(null);
  const [adjustFor, setAdjustFor] = useState<Medication | null>(null);
  const [deleteFor, setDeleteFor] = useState<Medication | null>(null);

  const active = medications.filter((m) => !m.archivedAt);
  const archived = medications.filter((m) => m.archivedAt);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Medications</h1>
        <Button asChild size="sm">
          <Link to="/meds/new"><Plus className="h-4 w-4 mr-1" /> Add</Link>
        </Button>
      </div>

      {active.length === 0 && archived.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No medications yet.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {active.map((med) => (
          <MedCard
            key={med.id}
            med={med}
            onRefill={() => setRefillFor(med)}
            onAdjust={() => setAdjustFor(med)}
            onDelete={() => setDeleteFor(med)}
          />
        ))}
      </div>

      {archived.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Archived</h2>
          <div className="space-y-2">
            {archived.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="font-medium">{m.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => actions.unarchiveMedication(m.id)}>
                      <ArchiveRestore className="h-4 w-4 mr-1" /> Restore
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteFor(m)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <RefillDialog med={refillFor} onClose={() => setRefillFor(null)} />
      <AdjustDialog med={adjustFor} onClose={() => setAdjustFor(null)} />
      <DeleteDialog med={deleteFor} onClose={() => setDeleteFor(null)} />
    </AppShell>
  );
}

function MedCard({
  med,
  onRefill,
  onAdjust,
  onDelete,
}: {
  med: Medication;
  onRefill: () => void;
  onAdjust: () => void;
  onDelete: () => void;
}) {
  const low = isLowSupply(med);
  const dos = daysOfSupplyRemaining(med);
  const pct =
    med.supply.originalQty > 0
      ? Math.min(100, (med.supply.currentPills / med.supply.originalQty) * 100)
      : 0;
  const outOfRefills = med.supply.refillsRemaining === 0;

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: med.color }} />
            <div className="min-w-0">
              <div className="font-semibold truncate">{med.name}</div>
              <div className="text-xs text-muted-foreground">
                {describeSchedule(med.schedule)} · {med.pillsPerDose} pill/dose
              </div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button asChild size="icon" variant="ghost">
              <Link to="/meds/$id/edit" params={{ id: med.id }} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="icon" variant="ghost" onClick={() => actions.archiveMedication(med.id)} aria-label="Archive">
              <Archive className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between text-sm mb-1">
            <span>
              <span className="font-medium">{med.supply.currentPills}</span>
              <span className="text-muted-foreground"> / {med.supply.originalQty} pills</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {dos != null ? `~${Math.floor(dos)} day${Math.floor(dos) === 1 ? "" : "s"} left` : "as-needed"}
            </span>
          </div>
          <Progress value={pct} className={low ? "[&>div]:bg-destructive" : ""} />
        </div>

        {(low || outOfRefills) && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            {outOfRefills ? "No refills left — contact your doctor." : "Low supply — time to refill."}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onRefill}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refilled
          </Button>
          <Button size="sm" variant="ghost" onClick={onAdjust}>
            Adjust count
          </Button>
          {med.supply.refillsRemaining != null && (
            <Badge variant="secondary" className="ml-auto">
              {med.supply.refillsRemaining} refill{med.supply.refillsRemaining === 1 ? "" : "s"} left
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RefillDialog({ med, onClose }: { med: Medication | null; onClose: () => void }) {
  const [qty, setQty] = useState("");
  const open = !!med;
  if (med && qty === "") {
    setTimeout(() => setQty(String(med.supply.originalQty)), 0);
  }
  function submit() {
    if (!med) return;
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a positive number");
      return;
    }
    actions.recordRefill({ medId: med.id, pillsAdded: n });
    toast.success(`Added ${n} pills to ${med.name}`);
    setQty("");
    onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setQty(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record refill</DialogTitle>
          <DialogDescription>
            How many pills did you add to {med?.name}?
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="qty">Pills added</Label>
          <Input id="qty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setQty(""); onClose(); }}>Cancel</Button>
          <Button onClick={submit}>Save refill</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustDialog({ med, onClose }: { med: Medication | null; onClose: () => void }) {
  const [val, setVal] = useState("");
  const open = !!med;
  if (med && val === "") {
    setTimeout(() => setVal(String(med.supply.currentPills)), 0);
  }
  function submit() {
    if (!med) return;
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a non-negative number");
      return;
    }
    actions.adjustPillCount(med.id, n);
    toast.success(`Updated ${med.name} count`);
    setVal("");
    onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setVal(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust pill count</DialogTitle>
          <DialogDescription>Set the exact number of pills on hand for {med?.name}.</DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="val">Pills on hand</Label>
          <Input id="val" type="number" min="0" value={val} onChange={(e) => setVal(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setVal(""); onClose(); }}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ med, onClose }: { med: Medication | null; onClose: () => void }) {
  const open = !!med;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {med?.name}?</DialogTitle>
          <DialogDescription>This permanently removes the medication and all its dose & refill history.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (med) {
                actions.deleteMedication(med.id);
                toast.success(`Deleted ${med.name}`);
              }
              onClose();
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}