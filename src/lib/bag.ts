import { DAYS_ID, ymd } from './dates.ts';
import type { Schedule, Task } from './model.ts';
import { subjectsOn } from './schedule.ts';

export interface Bag {
  date: string;
  dayName: string;
  /** mapel pada hari itu (dari jadwal) */
  subjects: string[];
  /** tugas yang harus dikumpul (jenis tugas/kumpul), belum selesai */
  kumpul: Task[];
  /** barang yang harus dibawa, belum selesai */
  bawa: Task[];
  /** jumlah item (kumpul+bawa) yang sudah dicentang untuk hari itu */
  doneCount: number;
  /** tidak ada apa pun untuk disiapkan */
  empty: boolean;
  /** semua sudah siap (ada item dan semuanya tercentang) */
  ready: boolean;
}

/** Isi "Tas Besok" untuk tanggal `forDate`. Item yang sudah dicentang tetap ikut dihitung untuk status "siap". */
export function buildBag(tasks: Task[], schedule: Schedule, forDate: Date): Bag {
  const date = ymd(forDate);
  const due = tasks.filter((t) => t.due === date);
  const open = due.filter((t) => !t.done);
  const kumpul = open.filter((t) => t.kind !== 'bawa').sort(byTime);
  const bawa = open.filter((t) => t.kind === 'bawa').sort(byTime);
  const doneCount = due.filter((t) => t.done).length;
  const subjects = subjectsOn(schedule, forDate);
  const items = kumpul.length + bawa.length;
  return {
    date,
    dayName: DAYS_ID[forDate.getDay()],
    subjects,
    kumpul,
    bawa,
    doneCount,
    empty: items + doneCount === 0 && subjects.length === 0,
    ready: items === 0 && doneCount > 0,
  };
}

const byTime = (a: Task, b: Task) => (a.time ?? '99').localeCompare(b.time ?? '99') || a.createdAt.localeCompare(b.createdAt);

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

/** Teks ringkas untuk isi notifikasi. */
export function bagBody(b: Bag): string {
  const parts: string[] = [];
  if (b.subjects.length) parts.push(b.subjects.join(', '));
  if (b.kumpul.length) parts.push('Kumpul: ' + b.kumpul.map((t) => t.title).join(', '));
  if (b.bawa.length) parts.push('Bawa: ' + b.bawa.map((t) => t.title).join(', '));
  if (!parts.length) return 'Tidak ada yang perlu disiapkan.';
  return clip(parts.join(' · '), 160);
}

/** Teks lengkap (notifikasi yang dibuka / dibagikan). */
export function bagLong(b: Bag): string {
  const lines: string[] = [];
  if (b.subjects.length) lines.push('Pelajaran: ' + b.subjects.join(', '));
  if (b.kumpul.length) lines.push('Kumpul:', ...b.kumpul.map((t) => '• ' + t.title));
  if (b.bawa.length) lines.push('Bawa:', ...b.bawa.map((t) => '• ' + t.title));
  return lines.join('\n') || 'Tidak ada yang perlu disiapkan.';
}
