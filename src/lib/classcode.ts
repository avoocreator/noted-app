import { emptySchedule, type Schedule } from './model.ts';

const PREFIX = 'NOTED1-';

function toB64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Jadwal → kode teks pendek yang bisa dibagikan lewat WhatsApp. Tanpa server. */
export function encodeSchedule(s: Schedule): string {
  return PREFIX + toB64Url(JSON.stringify(s.slice(0, 7)));
}

/** Kode (atau pesan yang memuat kode) → jadwal, atau null bila tidak valid. */
export function decodeSchedule(input: string): Schedule | null {
  const m = /NOTED1-([A-Za-z0-9_-]+)/.exec(input);
  if (!m) return null;
  try {
    const arr: unknown = JSON.parse(fromB64Url(m[1]));
    if (!Array.isArray(arr) || arr.length !== 7) return null;
    const out = emptySchedule();
    for (let i = 0; i < 7; i++) {
      const day = arr[i];
      if (!Array.isArray(day) || day.length > 20) return null;
      for (const x of day) {
        if (typeof x !== 'string' || x.length > 40) return null;
        if (x.trim()) out[i].push(x.trim());
      }
    }
    return out;
  } catch { return null; }
}

/** Pesan siap kirim berisi kode jadwal. */
export const classMessage = (s: Schedule) => `Jadwal pelajaran kelas kita di Noted. Salin pesan ini lalu pilih "Impor dari kode kelas" di aplikasi:\n\n${encodeSchedule(s)}`;
