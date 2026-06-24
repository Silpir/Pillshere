# Medication Reminder App — Plan

A lightweight, local-only (no login) reminder app to track multiple medications on flexible schedules. You confirm each dose as taken/skipped so there's no confusion about whether you already took it. Full history, adherence stats, and pill-supply tracking with refill reminders.

## Pages (routes)

- `/` — **Today**: every dose scheduled for today, grouped into Overdue / Upcoming / Done. Big "Mark taken" and "Skip" buttons on each. Shows last-taken time per med so you can't double-dose. Banner at top when any med is low on supply or due for refill.
- `/meds` — **Medications**: list, add, edit, archive. Each card shows current pill count, days of supply remaining, and a refill badge if low.
- `/meds/new` and `/meds/$id/edit` — **Add / Edit Medication** form.
- `/history` — **History & Stats**: weekly calendar heatmap, adherence % (overall + per med), current streak, full log table. Also a **Refill log** showing each top-up.

## Medication fields

Captured in the add/edit form:

- **Name** (required)
- **Pills per dose** (default 1) — how many pills consumed each time you mark a dose taken
- **Color tag** for quick visual ID
- **Schedule** (see below)
- **Supply tracking** (see below)

## Schedule model (flexible)

Per medication, one or more rules:
- **Daily** at fixed times (e.g. 08:00, 20:00)
- **Specific weekdays** at fixed times (Mon/Wed/Fri 09:00)
- **Every N days** from a start date
- **As needed (PRN)** — no scheduled doses, just a "Log dose now" button

Each scheduled time generates a "dose instance" for the day, which is what you check off.

## Supply & refill tracking

Per medication:
- **Total pills prescribed** (the original quantity, e.g. 90)
- **Current pills on hand** (auto-decrements by "pills per dose" every time a dose is marked Taken)
- **Refill reminder threshold** — either **days of supply remaining** (e.g. remind when ≤ 7 days left) or **pill count** (e.g. remind when ≤ 10 pills left). User picks one.
- **Auto-calculated days remaining** = `currentPills / averagePillsPerDay` (derived from active schedules).
- **Refills remaining** on prescription (optional integer) — when this hits 0, reminder switches to "Contact doctor for new prescription".

Refill actions:
- **"Refilled" button** on the med card → dialog to enter new pill count to add (default = original prescribed amount). Records a refill log entry with timestamp and quantity. Resets the low-supply warning.
- **"Adjust count"** for manual corrections (spilled a pill, etc.).
- Skipping or missing a dose does NOT decrement supply.

Reminders surface in-app:
- Red badge + banner on Today and Meds pages when any med is at/under threshold.
- Sonner toast after marking a dose taken if that action crossed the threshold.

## Dose check-off behavior

- Tap **Taken** → timestamps it, decrements pill supply, updates streak.
- Tap **Skip** → records as skipped with optional reason (no supply change).
- Done doses show a clear "Taken at 8:04 AM" state and move to Done.
- **Undo** within 30 seconds (also restores pill count).
- Past unconfirmed doses auto-flag as "Missed" after end of day; can be retro-marked from History (supply adjusts accordingly).

## Data & persistence (Technical)

- **Storage**: `localStorage` via a typed wrapper, no backend, no login.
- **Shape**:
  - `medications[]`: `{ id, name, color, pillsPerDose, schedules[], supply: { originalQty, currentPills, refillThreshold: { type: 'days'|'pills', value }, refillsRemaining? }, archivedAt? }`
  - `doseLog[]`: `{ id, medId, scheduledFor, status: 'taken'|'skipped'|'missed', actedAt?, note?, pillsConsumed? }`
  - `refillLog[]`: `{ id, medId, at, pillsAdded, note? }`
- **Today computation**: pure function expands each med's schedules into today's scheduled times, then left-joins `doseLog` to determine state.
- **Stats**: adherence = taken / (taken + skipped + missed); streak = consecutive days with 100% taken; days-of-supply = currentPills / avg daily consumption.
- **Export/Import**: JSON download/upload on History so data isn't trapped in one browser.
- All inputs validated with **zod** (numbers ≥ 0, name length limits, etc.).

## Stack (Technical)

- TanStack Start routes under `src/routes/`: `index.tsx`, `meds.tsx` (layout), `meds.index.tsx`, `meds.new.tsx`, `meds.$id.edit.tsx`, `history.tsx`.
- Zustand store persisted to `localStorage`.
- shadcn components already in repo: card, button, dialog, form, input, select, switch, tabs, badge, alert, progress, sonner.
- Date logic via `date-fns`.
- 100% client-side; no Lovable Cloud, no server functions.

## Out of scope (can add later)

- Browser/email notifications, multi-device sync, accounts, caregiver sharing, dosage strength / form / prescriber details, instructions field.
