import { addDays } from './dates.ts';
import { emptySchedule, type Schedule } from './model.ts';
import { sameSubject } from './subjects.ts';

/** Senin–Sabtu (indeks getDay). Minggu tidak ditampilkan di editor. */
export const SCHOOL_DAYS = [1, 2, 3, 4, 5, 6];

export const hasSchedule = (s: Schedule) => s.some((d) => d.length > 0);

/** Mapel pada tanggal tertentu, tanpa duplikat persis (jam pelajaran berurutan sering mengulang mapel). */
export function subjectsOn(s: Schedule, d: Date): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of s[d.getDay()] ?? []) {
    const k = x.trim().toLowerCase();
    if (k && !seen.has(k)) { seen.add(k); out.push(x); }
  }
  return out;
}

/** Tanggal pelajaran `subject` berikutnya, SETELAH `from` (maks `horizon` hari). */
export function nextMeeting(s: Schedule, subject: string, from: Date, horizon = 14): Date | null {
  for (let i = 1; i <= horizon; i++) {
    const d = addDays(from, i);
    if ((s[d.getDay()] ?? []).some((x) => sameSubject(x, subject))) return d;
  }
  return null;
}

/** Semua mapel di jadwal (unik, urutan pertama muncul). */
export function knownSubjects(s: Schedule): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const day of s) for (const x of day) { const k = x.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
}

export function setDay(s: Schedule, day: number, list: string[]): Schedule {
  const out = s.map((d) => [...d]);
  while (out.length < 7) out.push([]);
  out[day] = list;
  return out;
}

export function copyDay(s: Schedule, from: number, to: number): Schedule {
  return setDay(s, to, [...(s[from] ?? [])]);
}

export const normalizeSchedule = (s: Schedule): Schedule => (s.length === 7 ? s : [...s, ...emptySchedule()].slice(0, 7));
