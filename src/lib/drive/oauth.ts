// Google OAuth 2.0 Authorization Code + PKCE for browser-only SPAs.
// No client secret — Google Client ID is public, PKCE protects the code.

import {
  clearCachedFolderId,
  clearTokens,
  getClientId,
  getTokens,
  setTokens,
  type DriveTokens,
} from "./tokens";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "openid",
  "email",
].join(" ");

const PENDING_KEY = "pillshere-gdrive-pending";

interface PendingAuth {
  state: string;
  verifier: string;
  redirectUri: string;
  clientId: string;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(len: number): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return base64UrlEncode(arr);
}

async function challengeFrom(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64UrlEncode(new Uint8Array(digest));
}

export function getRedirectUri(): string {
  return `${window.location.origin}/oauth/google/callback`;
}

/**
 * Start the OAuth flow. Opens a popup for consent; resolves with tokens
 * once the callback route posts the code back. Rejects if the user closes
 * the popup or denies.
 */
export async function startAuth(): Promise<DriveTokens> {
  const clientId = getClientId();
  if (!clientId) throw new Error("Missing Google Client ID");

  const state = randomString(24);
  const verifier = randomString(64);
  const challenge = await challengeFrom(verifier);
  const redirectUri = getRedirectUri();

  const pending: PendingAuth = { state, verifier, redirectUri, clientId };
  window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");

  const popup = window.open(url.toString(), "pillshere-gdrive", "width=520,height=680");
  if (!popup) throw new Error("Popup blocked. Allow popups and try again.");

  const code = await new Promise<string>((resolve, reject) => {
    const origin = window.location.origin;
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== origin) return;
      const data = ev.data as { source?: string; code?: string; state?: string; error?: string };
      if (!data || data.source !== "pillshere-gdrive-callback") return;
      window.removeEventListener("message", onMessage);
      clearInterval(poll);
      if (data.error) return reject(new Error(data.error));
      if (data.state !== state) return reject(new Error("State mismatch"));
      if (!data.code) return reject(new Error("No authorization code"));
      resolve(data.code);
    };
    window.addEventListener("message", onMessage);
    const poll = window.setInterval(() => {
      if (popup.closed) {
        clearInterval(poll);
        window.removeEventListener("message", onMessage);
        reject(new Error("Sign-in cancelled"));
      }
    }, 500);
  });

  window.sessionStorage.removeItem(PENDING_KEY);

  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  const tok = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  const tokens: DriveTokens = {
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token,
    expiresAt: Date.now() + tok.expires_in * 1000,
    scope: tok.scope,
  };
  // Fetch email for display.
  try {
    const info = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (info.ok) {
      const { email } = (await info.json()) as { email?: string };
      tokens.email = email;
    }
  } catch {
    /* non-fatal */
  }
  setTokens(tokens);
  return tokens;
}

export async function refreshAccessToken(): Promise<DriveTokens> {
  const current = getTokens();
  const clientId = getClientId();
  if (!current?.refreshToken) throw new Error("No refresh token");
  if (!clientId) throw new Error("Missing Google Client ID");
  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: current.refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const tok = (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
  };
  const next: DriveTokens = {
    ...current,
    accessToken: tok.access_token,
    expiresAt: Date.now() + tok.expires_in * 1000,
    scope: tok.scope ?? current.scope,
  };
  setTokens(next);
  return next;
}

export async function getValidAccessToken(): Promise<string> {
  const t = getTokens();
  if (!t) throw new Error("Not connected to Google Drive");
  // Refresh with a 60s buffer.
  if (t.expiresAt - Date.now() > 60_000) return t.accessToken;
  if (!t.refreshToken) throw new Error("Session expired; please reconnect");
  const next = await refreshAccessToken();
  return next.accessToken;
}

export async function disconnect(): Promise<void> {
  const t = getTokens();
  if (t?.accessToken) {
    try {
      await fetch(`${REVOKE_URL}?token=${encodeURIComponent(t.accessToken)}`, {
        method: "POST",
      });
    } catch {
      /* ignore */
    }
  }
  clearTokens();
  clearCachedFolderId();
}