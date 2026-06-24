import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { MedForm } from "@/components/med-form";
import { actions, useAppState } from "@/lib/medications/store";

export const Route = createFileRoute("/meds/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit medication — MedTrack" },
      { name: "description", content: "Edit medication schedule and supply settings." },
    ],
  }),
  component: EditMedPage,
  notFoundComponent: () => (
    <AppShell>
      <p className="text-muted-foreground">Medication not found.</p>
    </AppShell>
  ),
});

function EditMedPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { medications } = useAppState();
  const med = medications.find((m) => m.id === id);

  return (
    <AppShell>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/meds"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>
      <h1 className="text-2xl font-semibold mb-6">Edit medication</h1>
      {!med ? (
        <p className="text-muted-foreground">Medication not found.</p>
      ) : (
        <MedForm
          initial={med}
          submitLabel="Save changes"
          onCancel={() => navigate({ to: "/meds" })}
          onSubmit={(v) => {
            actions.updateMedication(med.id, v);
            toast.success(`Saved ${v.name}`);
            navigate({ to: "/meds" });
          }}
        />
      )}
    </AppShell>
  );
}