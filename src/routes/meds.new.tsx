import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { MedForm } from "@/components/med-form";
import { actions } from "@/lib/medications/store";

export const Route = createFileRoute("/meds/new")({
  head: () => ({
    meta: [
      { title: "Add medication — Prozume" },
      { name: "description", content: "Add a new medication with schedule and supply tracking." },
    ],
  }),
  component: NewMedPage,
});

function NewMedPage() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/meds"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>
      <h1 className="text-2xl font-semibold mb-6">Add medication</h1>
      <MedForm
        submitLabel="Add"
        onCancel={() => navigate({ to: "/meds" })}
        onSubmit={(v) => {
          actions.addMedication(v);
          toast.success(`Added ${v.name}`);
          navigate({ to: "/meds" });
        }}
      />
    </AppShell>
  );
}