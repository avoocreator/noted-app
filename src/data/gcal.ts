import { parseGoogleEvents } from '../lib/gcalParser.ts';
import type { GCalEvent } from '../lib/model.ts';

const TOKEN_KEY = 'noted_gcal_token';
const EXPIRY_KEY = 'noted_gcal_expiry';

export const isOnline = (): boolean => (typeof navigator !== 'undefined' ? navigator.onLine : true);

export function getStoredToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? '0');
    if (!token || Date.now() >= expiry) {
      clearStoredToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function saveStoredToken(token: string, expiresInSeconds: number): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + (expiresInSeconds - 60) * 1000));
  } catch {}
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  } catch {}
}

export async function fetchGCalRawEvents(token: string, options: { timeMin?: string; timeMax?: string } = {}): Promise<unknown[]> {
  const now = new Date();
  const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const next60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const timeMin = options.timeMin ?? past30;
  const timeMax = options.timeMax ?? next60;

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=250`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearStoredToken();
      throw new Error('Sesi Google Calendar berakhir. Silakan hubungkan kembali.');
    }
    throw new Error(`Gagal memuat kalender: ${res.statusText}`);
  }

  const data = (await res.json()) as { items?: unknown[] };
  return Array.isArray(data.items) ? data.items : [];
}

export async function syncGCalEvents(token: string): Promise<{ success: boolean; events: GCalEvent[]; error?: string }> {
  if (!isOnline()) {
    return { success: false, events: [], error: 'offline' };
  }

  try {
    const rawItems = await fetchGCalRawEvents(token);
    const events = parseGoogleEvents(rawItems);
    return { success: true, events };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal sinkronisasi';
    return { success: false, events: [], error: msg };
  }
}
