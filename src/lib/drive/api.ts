// Google Drive v3 REST wrappers. Uses the client-only OAuth tokens.

import { getValidAccessToken } from "./oauth";
import {
  getCachedFolderId,
  setCachedFolderId,
  clearCachedFolderId,
} from "./tokens";

const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_NAME = "Pillshere";
const FOLDER_MIME = "application/vnd.google-apps.folder";

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getValidAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive ${res.status}: ${body}`);
  }
  return res;
}

export interface DriveFile {
  id: string;
  name: string;
  size?: string;
  createdTime?: string;
}

export async function ensurePillshereFolder(): Promise<string> {
  const cached = getCachedFolderId();
  if (cached) {
    // Verify still exists / not trashed.
    try {
      const res = await authFetch(
        `${DRIVE}/files/${cached}?fields=id,trashed`,
      );
      const data = (await res.json()) as { id: string; trashed: boolean };
      if (!data.trashed) return data.id;
    } catch {
      // fall through and recreate
    }
    clearCachedFolderId();
  }
  // Search by name.
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`,
  );
  const listRes = await authFetch(
    `${DRIVE}/files?q=${q}&fields=files(id,name)&spaces=drive`,
  );
  const list = (await listRes.json()) as { files: DriveFile[] };
  if (list.files && list.files.length > 0) {
    setCachedFolderId(list.files[0].id);
    return list.files[0].id;
  }
  // Create it.
  const createRes = await authFetch(`${DRIVE}/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
  });
  const { id } = (await createRes.json()) as { id: string };
  setCachedFolderId(id);
  return id;
}

function timestampName(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `pillshere-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}

export async function uploadBackup(json: string): Promise<DriveFile> {
  const folderId = await ensurePillshereFolder();
  const name = timestampName();
  const boundary = `-------pillshere${Math.random().toString(36).slice(2)}`;
  const metadata = { name, parents: [folderId], mimeType: "application/json" };
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${json}\r\n` +
    `--${boundary}--`;
  const res = await authFetch(
    `${UPLOAD}/files?uploadType=multipart&fields=id,name,size,createdTime`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  return (await res.json()) as DriveFile;
}

export async function listBackups(): Promise<DriveFile[]> {
  const folderId = await ensurePillshereFolder();
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await authFetch(
    `${DRIVE}/files?q=${q}&orderBy=createdTime desc&fields=files(id,name,size,createdTime)&pageSize=100`,
  );
  const data = (await res.json()) as { files: DriveFile[] };
  return data.files ?? [];
}

export async function downloadBackup(fileId: string): Promise<string> {
  const res = await authFetch(`${DRIVE}/files/${fileId}?alt=media`);
  return await res.text();
}

export async function deleteBackup(fileId: string): Promise<void> {
  await authFetch(`${DRIVE}/files/${fileId}`, { method: "DELETE" });
}

export async function pruneBackups(maxKeep = 10): Promise<number> {
  const files = await listBackups();
  const extras = files.slice(maxKeep);
  let deleted = 0;
  for (const f of extras) {
    try {
      await deleteBackup(f.id);
      deleted++;
    } catch {
      /* non-fatal */
    }
  }
  return deleted;
}