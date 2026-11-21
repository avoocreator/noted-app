import { migrate, type DB } from './model.ts';

// Types
export interface BackupFile { app: 'noted'; version: 1; exportedAt: string; data: DB }

// Backup
export function exportBackup(db: DB, now = new Date()): string {
  const f: BackupFile = { app: 'noted', version: 1, exportedAt: now.toISOString(), data: db };
  return JSON.stringify(f, null, 1);
}

export type BackupResult = { ok: true; db: DB } | { ok: false; error: string };

export function parseBackup(text: string): BackupResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: 'Berkas bukan cadangan Noted yang valid.' }; }
  if (!raw || typeof raw !== 'object' || (raw as { app?: unknown }).app !== 'noted') return { ok: false, error: 'Berkas ini bukan cadangan Noted.' };
  const data = (raw as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return { ok: false, error: 'Isi cadangan kosong atau rusak.' };
  return { ok: true, db: migrate(data) };
}

export function daysSinceBackup(lastBackup: string | undefined, now = new Date()): number | null {
  if (!lastBackup) return null;
  const t = Date.parse(lastBackup);
  return Number.isNaN(t) ? null : Math.floor((now.getTime() - t) / 86_400_000);
}

export function backupNudge(db: DB, now = new Date()): boolean {
  const meaningful = db.tasks.length + db.notes.length >= 3;
  if (!meaningful) return false;
  const d = daysSinceBackup(db.settings.lastBackup, now);
  return d === null || d >= 14;
}
