import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google/callback")({
  head: () => ({
    meta: [
      { title: "Connecting Google Drive…" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GoogleCallbackPage,
});

function GoogleCallbackPage() {
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") ?? undefined;
    const state = params.get("state") ?? undefined;
    const error = params.get("error") ?? undefined;

    const payload = {
      source: "pillshere-gdrive-callback" as const,
      code,
      state,
      error,
    };

    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(payload, window.location.origin);
      } catch (e) {
        console.error(e);
      }
      setMessage("You can close this window.");
      window.setTimeout(() => window.close(), 300);
    } else {
      setMessage(
        error
          ? `Sign-in failed: ${error}`
          : "Sign-in complete. You can return to the Pillshere tab.",
      );
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">Google Drive</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}