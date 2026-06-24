import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MED_COLORS, type Medication, type Schedule } from "@/lib/medications/types";
import { medFormSchema } from "@/lib/medications/schemas";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Draft = {
  name: string;
  color: string;
  pillsPerDose: string;
  scheduleKind: Schedule["kind"];
  times: string[];
  weekdays: number[];
  everyN: string;
  startDate: string;
  originalQty: string;
  currentPills: string;
  refillThresholdType: "days" | "pills";
  refillThresholdValue: string;
  refillsRemaining: string;
};

function medToDraft(m?: Medication): Draft {
  const today = new Date().toISOString().slice(0, 10);
  if (!m) {
    return {
      name: "",
      color: MED_COLORS[5],
      pillsPerDose: "1",
      scheduleKind: "daily",
      times: ["08:00"],
      weekdays: [1, 3, 5],
      everyN: "2",
      startDate: today,
      originalQty: "30",
      currentPills: "30",
      refillThresholdType: "days",
      refillThresholdValue: "7",
      refillsRemaining: "",
    };
  }
  const s = m.schedule;
  return {
    name: m.name,
    color: m.color,
    pillsPerDose: String(m.pillsPerDose),
    scheduleKind: s.kind,
    times: s.kind === "prn" ? ["08:00"] : s.times,
    weekdays: s.kind === "weekdays" ? s.weekdays : [1, 3, 5],
    everyN: s.kind === "every_n_days" ? String(s.everyN) : "2",
    startDate: s.kind === "every_n_days" ? s.startDate : today,
    originalQty: String(m.supply.originalQty),
    currentPills: String(m.supply.currentPills),
    refillThresholdType: m.supply.refillThreshold.type,
    refillThresholdValue: String(m.supply.refillThreshold.value),
    refillsRemaining:
      m.supply.refillsRemaining != null ? String(m.supply.refillsRemaining) : "",
  };
}

export type MedFormSubmit = Omit<Medication, "id" | "createdAt" | "archivedAt">;

export function MedForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: {
  initial?: Medication;
  onSubmit: (med: MedFormSubmit) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [d, setD] = useState<Draft>(() => medToDraft(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof Draft>(k: K, v: Draft[K]) {
    setD((p) => ({ ...p, [k]: v }));
  }

  function buildSchedule(): Schedule {
    if (d.scheduleKind === "prn") return { kind: "prn" };
    if (d.scheduleKind === "daily") return { kind: "daily", times: d.times };
    if (d.scheduleKind === "weekdays")
      return { kind: "weekdays", weekdays: d.weekdays, times: d.times };
    return {
      kind: "every_n_days",
      everyN: Number(d.everyN),
      startDate: d.startDate,
      times: d.times,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = medFormSchema.safeParse({
      name: d.name,
      color: d.color,
      pillsPerDose: Number(d.pillsPerDose),
      schedule: buildSchedule(),
      originalQty: Number(d.originalQty),
      currentPills: Number(d.currentPills),
      refillThresholdType: d.refillThresholdType,
      refillThresholdValue: Number(d.refillThresholdValue),
      refillsRemaining: d.refillsRemaining === "" ? undefined : Number(d.refillsRemaining),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path.join(".")] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    const v = parsed.data;
    onSubmit({
      name: v.name,
      color: v.color,
      pillsPerDose: v.pillsPerDose,
      schedule: v.schedule,
      supply: {
        originalQty: v.originalQty,
        currentPills: v.currentPills,
        refillThreshold: { type: v.refillThresholdType, value: v.refillThresholdValue },
        refillsRemaining: v.refillsRemaining,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-3">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={d.name}
            maxLength={80}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Metformin"
          />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>

        <div>
          <Label>Color tag</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {MED_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update("color", c)}
                className={`h-8 w-8 rounded-full border-2 transition ${d.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="ppd">Pills per dose</Label>
          <Input
            id="ppd"
            type="number"
            step="0.25"
            min="0.25"
            value={d.pillsPerDose}
            onChange={(e) => update("pillsPerDose", e.target.value)}
          />
          {errors.pillsPerDose && (
            <p className="text-xs text-destructive mt-1">{errors.pillsPerDose}</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="font-medium text-sm">Schedule</div>
        <div>
          <Label htmlFor="kind">Repeats</Label>
          <Select value={d.scheduleKind} onValueChange={(v) => update("scheduleKind", v as Schedule["kind"])}>
            <SelectTrigger id="kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Every day</SelectItem>
              <SelectItem value="weekdays">Specific weekdays</SelectItem>
              <SelectItem value="every_n_days">Every N days</SelectItem>
              <SelectItem value="prn">As needed (PRN)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {d.scheduleKind === "weekdays" && (
          <div>
            <Label>Days</Label>
            <div className="flex gap-1 mt-2">
              {WEEKDAYS.map((n, i) => {
                const active = d.weekdays.includes(i);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      update(
                        "weekdays",
                        active ? d.weekdays.filter((w) => w !== i) : [...d.weekdays, i].sort(),
                      )
                    }
                    className={`flex-1 py-2 rounded-md text-xs font-medium border transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {errors["schedule.weekdays"] && (
              <p className="text-xs text-destructive mt-1">{errors["schedule.weekdays"]}</p>
            )}
          </div>
        )}

        {d.scheduleKind === "every_n_days" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="everyN">Every (days)</Label>
              <Input
                id="everyN"
                type="number"
                min="1"
                value={d.everyN}
                onChange={(e) => update("everyN", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="start">Start date</Label>
              <Input
                id="start"
                type="date"
                value={d.startDate}
                onChange={(e) => update("startDate", e.target.value)}
              />
            </div>
          </div>
        )}

        {d.scheduleKind !== "prn" && (
          <div>
            <Label>Times of day</Label>
            <div className="space-y-2 mt-2">
              {d.times.map((t, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    type="time"
                    value={t}
                    onChange={(e) => {
                      const next = [...d.times];
                      next[idx] = e.target.value;
                      update("times", next);
                    }}
                  />
                  {d.times.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => update("times", d.times.filter((_, i) => i !== idx))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => update("times", [...d.times, "20:00"])}
              >
                <Plus className="h-3 w-3 mr-1" /> Add time
              </Button>
            </div>
            {errors["schedule.times"] && (
              <p className="text-xs text-destructive mt-1">{errors["schedule.times"]}</p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="font-medium text-sm">Supply & refills</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="orig">Pills prescribed</Label>
            <Input
              id="orig"
              type="number"
              min="0"
              value={d.originalQty}
              onChange={(e) => update("originalQty", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cur">Pills on hand</Label>
            <Input
              id="cur"
              type="number"
              min="0"
              value={d.currentPills}
              onChange={(e) => update("currentPills", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1fr] gap-3">
          <div>
            <Label>Remind me when</Label>
            <Select
              value={d.refillThresholdType}
              onValueChange={(v) => update("refillThresholdType", v as "days" | "pills")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days">Days of supply left</SelectItem>
                <SelectItem value="pills">Pill count left</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="thr">{d.refillThresholdType === "days" ? "Days" : "Pills"} ≤</Label>
            <Input
              id="thr"
              type="number"
              min="0"
              value={d.refillThresholdValue}
              onChange={(e) => update("refillThresholdValue", e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="rr">Refills remaining on prescription (optional)</Label>
          <Input
            id="rr"
            type="number"
            min="0"
            value={d.refillsRemaining}
            onChange={(e) => update("refillsRemaining", e.target.value)}
            placeholder="e.g. 3"
          />
        </div>
      </section>

      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}