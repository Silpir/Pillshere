# Google Drive Backup — Implementation Plan (no Lovable Cloud)

Manual "Back up to Google Drive" from Settings. Each user signs in with their own Google account; snapshots are written to a **`Pillshere/` folder** in *their* Drive with a timestamped filename, and the app keeps the most recent 10. Restore lets the user pick a snapshot from a list. No backend database — Google tokens live in the browser only.

## User flow

1. Settings → "Google Drive backup" section.
2. First use → **Connect Google Drive** → Google OAuth consent (popup) → returns to app, shows "Connected as name@gmail.com".
3. **Back up now** → ensures `Pillshere/` folder exists, uploads `pillshere-YYYY-MM-DD-HHmm.json` into it, prunes to newest 10, toast on success.
4. **Restore** → lists snapshots in `Pillshere/` (name + date + size), user picks one → confirm dialog → downloads and runs the existing `actions.importJson` path (schema-validated).
5. **Disconnect** clears tokens from localStorage and revokes the token with Google.

## Auth model — PKCE, browser-only

Because there is no backend, we use the **OAuth 2.0 Authorization Code + PKCE** flow for browser SPAs. This flow does not need a client secret.

- OAuth client type in Google Cloud: **Web application** (Google supports PKCE for web clients; SPA-in-browser is the intended use).
- Scope: `https://www.googleapis.com/auth/drive.file` — the app can only see/modify files it created (including `Pillshere/` since the app creates it). Cannot read the user's other Drive files.
- Redirect URI: a static page in the app, e.g. `/oauth/google/callback`, that receives the `code` in the URL and posts it back to the opener window via `postMessage`.
- Token exchange happens **client-side** with `code_verifier` (no secret involved).
- Storage: `access_token`, `refresh_token`, `expires_at`, `email` in `localStorage` under `pillshere-gdrive-v1`. Auto-refresh with the refresh token when `expires_at` is near.

## Prerequisites the user must do once (Google Cloud)

1. Create a project in Google Cloud Console.
2. Enable **Google Drive API**.
3. Configure the OAuth consent screen (external; add themselves as a test user while in "Testing" mode, or publish it).
4. Create OAuth 2.0 Client ID → **Web application**.
5. Authorized JavaScript origins:
   - `http://localhost:8080`
   - `https://<published-domain>`
6. Authorized redirect URIs:
   - `http://localhost:8080/oauth/google/callback`
   - `https://<published-domain>/oauth/google/callback`
7. Copy the **Client ID** only. Paste it into the app's Settings → Google Drive → *Google Client ID* field (stored in localStorage). No client secret is used.

Client ID is a public value; PKCE prevents an attacker from redeeming an intercepted code.

## Files

- **`src/routes/oauth.google.callback.tsx`** — new route. Reads `code` + `state` from URL, matches state against `sessionStorage`, `postMessage`s the code back to `window.opener`, closes the popup. Fallback: if not opened as popup, shows a "return to Settings" message.
- **`src/lib/drive/oauth.ts`** — PKCE helpers (`generateVerifier`, `challengeFromVerifier` via `crypto.subtle`), `startAuth()` (opens popup + waits for `postMessage`), `exchangeCode()`, `refreshToken()`, `revoke()`.
- **`src/lib/drive/tokens.ts`** — localStorage read/write, `getValidAccessToken()` (refreshes if needed), `clearTokens()`.
- **`src/lib/drive/api.ts`** — thin `fetch` wrappers around `googleapis.com/drive/v3` and `/upload/drive/v3`:
  - `ensurePillshereFolder()` → `files.list?q="name='Pillshere' and mimeType='application/vnd.google-apps.folder' and trashed=false"`, create if missing (`mimeType: 'application/vnd.google-apps.folder'`, `name: 'Pillshere'`), cache folder ID in localStorage.
  - `uploadBackup(json)` → multipart upload with parent = Pillshere folder ID, `name: 'pillshere-YYYY-MM-DD-HHmm.json'`.
  - `listBackups()` → `files.list?q="'<folderId>' in parents and trashed=false"&orderBy=createdTime desc&fields=files(id,name,size,createdTime)`.
  - `downloadBackup(fileId)` → `files/{id}?alt=media`.
  - `deleteBackup(fileId)` → `DELETE files/{id}`.
  - `pruneBackups(maxKeep = 10)` → delete oldest beyond N.
  - `getUserEmail()` → `https://www.googleapis.com/oauth2/v2/userinfo` (uses same token; needs the implicit `openid email` scope added).
- **`src/components/drive-backup-card.tsx`** — UI: client-ID input (if not set), Connect/Disconnect, connection status with email, Back up now button, snapshots list with Restore per row. Uses TanStack Query.
- **`src/routes/settings.tsx`** — new route hosting the card, added to the app nav.

## Snapshot retention

After each successful upload: list, sort by `createdTime` desc, delete anything past index 9. Failures to prune are non-fatal (log + toast warning; the upload itself already succeeded).

## Restore

Uses the existing validated import path in `src/lib/medications/store.ts` → `actions.importJson(raw)`, which schema-validates every field via `appStateSchema`. Confirm dialog warns that current data will be replaced.

## Security notes

- `drive.file` scope keeps the blast radius to files the app created (including the `Pillshere/` folder it creates).
- PKCE means an intercepted `code` cannot be redeemed without the in-memory verifier.
- OAuth `state` is a random value in `sessionStorage`; callback rejects mismatches.
- The callback route only accepts `postMessage` targeted to the exact app origin.
- No client secret in the codebase — it is not required for PKCE.
- Tokens sit in `localStorage`, same trust boundary as the medication data itself. Disconnect explicitly revokes the token with Google.
- The existing `appStateSchema` re-validates every restored file, so a tampered Drive file cannot poison state.

## Capacitor / Android note

The popup + `postMessage` flow works in the standard Android WebView but external browser redirects (Custom Tabs) are more robust on device. For v1 we ship the popup flow, which works on desktop web and inside the Capacitor WebView. If Android users hit consent-screen issues, a follow-up can switch to `@capacitor/browser` + a custom URL scheme.

## Out of scope

- Cross-device live sync / conflict resolution.
- Server-side encryption of the JSON (data is in the user's own Drive; can add passphrase-based encryption later).
- Native Google Sign-In SDK on Android.
- Any Lovable Cloud / Supabase usage — explicitly not part of this plan.

## Files touched (summary)

- **New:** `src/routes/oauth.google.callback.tsx`, `src/routes/settings.tsx`, `src/components/drive-backup-card.tsx`, `src/lib/drive/oauth.ts`, `src/lib/drive/tokens.ts`, `src/lib/drive/api.ts`.
- **Edited:** `src/components/app-shell.tsx` (add Settings nav link), possibly `src/start.ts` CSP `connect-src` already allows `https:` so no change needed; `frame-src` for the OAuth popup is not needed (it's a top-level window).
- **No secrets** stored via Lovable — the Google Client ID is entered by each user in Settings and lives in their own localStorage.
