// Persisted per-user Google Drive OAuth state — all client-side, no backend.

const TOKENS_KEY = "pillshere-gdrive-v1";
const CLIENT_ID_KEY = "pillshere-gdrive-client-id";
const FOLDER_ID_KEY = "pillshere-gdrive-folder-id";

export interface DriveTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
  email?: string;
  scope?: string;
}

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(CLIENT_ID_KEY) ?? "";
}

export function setClientId(id: string) {
  window.localStorage.setItem(CLIENT_ID_KEY, id.trim());
}

export function getTokens(): DriveTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TOKENS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DriveTokens;
  } catch {
    return null;
  }
}

export function setTokens(t: DriveTokens) {
  window.localStorage.setItem(TOKENS_KEY, JSON.stringify(t));
}

export function clearTokens() {
  window.localStorage.removeItem(TOKENS_KEY);
  window.localStorage.removeItem(FOLDER_ID_KEY);
}

export function getCachedFolderId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(FOLDER_ID_KEY);
}

export function setCachedFolderId(id: string) {
  window.localStorage.setItem(FOLDER_ID_KEY, id);
}

export function clearCachedFolderId() {
  window.localStorage.removeItem(FOLDER_ID_KEY);
}