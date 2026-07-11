import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { CloudUpload, RefreshCw, LogOut, LogIn, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getClientId,
  setClientId,
  getTokens,
  type DriveTokens,
} from "@/lib/drive/tokens";
import { startAuth, disconnect, getRedirectUri } from "@/lib/drive/oauth";
import {
  downloadBackup,
  listBackups,
  pruneBackups,
  uploadBackup,
  type DriveFile,
} from "@/lib/drive/api";
import { actions } from "@/lib/medications/store";

export function DriveBackupCard() {
  const [clientIdInput, setClientIdInput] = useState("");
  const [hasClientId, setHasClientId] = useState(false);
  const [tokens, setTokensState] = useState<DriveTokens | null>(null);
  const [busy, setBusy] = useState<"connect" | "backup" | "list" | null>(null);
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<DriveFile | null>(null);

  useEffect(() => {
    const id = getClientId();
    setHasClientId(!!id);
    setClientIdInput(id);
    setTokensState(getTokens());
  }, []);

  const refreshList = async () => {
    setBusy("list");
    try {
      setFiles(await listBackups());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to list backups");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (tokens) void refreshList();
  }, [tokens]);

  const saveClientId = () => {
    if (!clientIdInput.trim()) return;
    setClientId(clientIdInput);
    setHasClientId(true);
    toast.success("Client ID saved");
  };

  const onConnect = async () => {
    setBusy("connect");
    try {
      const t = await startAuth();
      setTokensState(t);
      toast.success(`Connected${t.email ? ` as ${t.email}` : ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(null);
    }
  };

  const onDisconnect = async () => {
    await disconnect();
    setTokensState(null);
    setFiles(null);
    toast.success("Disconnected from Google Drive");
  };

  const onBackup = async () => {
    setBusy("backup");
    try {
      const json = actions.exportJson();
      const file = await uploadBackup(json);
      const pruned = await pruneBackups(10);
      toast.success(
        `Backed up ${file.name}${pruned > 0 ? ` — removed ${pruned} old` : ""}`,
      );
      await refreshList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    if (!restoreTarget) return;
    const target = restoreTarget;
    setRestoreTarget(null);
    try {
      const text = await downloadBackup(target.id);
      actions.importJson(text);
      toast.success(`Restored from ${target.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudUpload className="h-5 w-5" /> Google Drive backup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasClientId ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Paste your Google OAuth <strong>Client ID</strong> (Web
              application). No client secret needed — this app uses PKCE.
            </p>
            <div className="rounded-md bg-muted p-3 text-xs space-y-1">
              <div className="font-medium">Setup checklist</div>
              <ol className="list-decimal ml-4 space-y-0.5">
                <li>Google Cloud Console → enable Google Drive API</li>
                <li>Create OAuth 2.0 Client ID (Web application)</li>
                <li>
                  Authorized redirect URI:{" "}
                  <code className="break-all">{getRedirectUri()}</code>
                </li>
                <li>Authorized JS origin: <code>{window.location.origin}</code></li>
              </ol>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gdrive-client-id">Google Client ID</Label>
              <Input
                id="gdrive-client-id"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="1234567890-xxxxxxx.apps.googleusercontent.com"
              />
              <Button onClick={saveClientId} disabled={!clientIdInput.trim()}>
                Save Client ID
              </Button>
            </div>
          </div>
        ) : !tokens ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in with Google to back up to a <strong>Pillshere</strong>{" "}
              folder in your Drive.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onConnect} disabled={busy === "connect"}>
                <LogIn className="h-4 w-4 mr-1.5" />
                {busy === "connect" ? "Connecting…" : "Connect Google Drive"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHasClientId(false)}
              >
                Change Client ID
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm">
                <div className="font-medium">Connected</div>
                <div className="text-muted-foreground">
                  {tokens.email ?? "Google account"}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onDisconnect}>
                <LogOut className="h-4 w-4 mr-1.5" /> Disconnect
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={onBackup} disabled={busy === "backup"}>
                <CloudUpload className="h-4 w-4 mr-1.5" />
                {busy === "backup" ? "Backing up…" : "Back up now"}
              </Button>
              <Button
                variant="outline"
                onClick={refreshList}
                disabled={busy === "list"}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
              </Button>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Snapshots (newest first, up to 10 kept)
              </div>
              {files === null ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : files.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No backups yet.
                </div>
              ) : (
                <ul className="divide-y rounded-md border">
                  {files.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-2 p-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate">{f.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {f.createdTime
                            ? format(parseISO(f.createdTime), "PPp")
                            : ""}
                          {f.size ? ` · ${Math.round(Number(f.size) / 1024)} KB` : ""}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRestoreTarget(f)}
                      >
                        <Download className="h-4 w-4 mr-1" /> Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={!!restoreTarget}
        onOpenChange={(o) => !o && setRestoreTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces all current medications, dose logs, and refills with
              the contents of <strong>{restoreTarget?.name}</strong>. This can't
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}