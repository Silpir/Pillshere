import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { DriveBackupCard } from "@/components/drive-backup-card";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Pillshere" },
      { name: "description", content: "Back up your Pillshere data to Google Drive." },
      { property: "og:title", content: "Settings — Pillshere" },
      { property: "og:description", content: "Back up your Pillshere data to Google Drive." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <DriveBackupCard />
    </AppShell>
  );
}