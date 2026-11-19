export const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const DAYS_SHORT_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const MONTHS_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const pad = (n: number) => String(n).padStart(2, '0');

export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "2026-11-18" → Date (tengah malam lokal), atau null bila tidak valid. */
export function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null;
}

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const day = d.getDate();
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes());
  const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, last));
  return x;
}

/** Hari berikutnya dengan weekday tertentu (0 = Minggu), selalu SETELAH `from`. */
export function nextWeekday(from: Date, weekday: number): Date {
  const diff = ((weekday - from.getDay() + 7) % 7) || 7;
  return addDays(startOfDay(from), diff);
}

/** Selisih hari kalender a − b. */
export const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);

/** "2026-11-19" + 'HH:mm' → ms epoch lokal. */
export function atTime(day: string, hhmm: string): number | null {
  const d = parseYmd(day);
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!d || !m) return null;
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.getTime();
}

/** Label tenggat singkat: Hari ini / Besok / Kemarin / Rabu / 24 Nov */
export function dueLabel(due: string, now: Date): string {
  const d = parseYmd(due);
  if (!d) return due;
  const diff = dayDiff(d, now);
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  if (diff === -1) return 'Kemarin';
  if (diff > 1 && diff < 7) return DAYS_ID[d.getDay()];
  return `${d.getDate()} ${MONTHS_SHORT_ID[d.getMonth()]}`;
}

export const longDay = (d: Date) => `${DAYS_ID[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT_ID[d.getMonth()]}`;

export function greeting(d = new Date()): string {
  const h = d.getHours();
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
}
