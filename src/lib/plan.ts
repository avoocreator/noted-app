import { addDays, atTime, startOfDay, ymd, DAYS_ID } from './dates.ts';
import { bagBody, bagLong, buildBag } from './bag.ts';
import type { DB, Task } from './model.ts';

export interface Planned {
  id: number;
  at: number;
  title: string;
  body: string;
  largeBody?: string;
  channel: 'noted-tugas' | 'noted-tas';
  /** kunci stabil; dipakai untuk membandingkan rencana lama dan baru */
  key: string;
}

/** ID notifikasi (int32 positif) yang stabil dari sebuah kunci. */
export function notifId(key: string): number {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  return Math.abs(h) % 2_000_000_000 || 1;
}

const MAX = 100;
const BAG_DAYS = 14;

const subjectTag = (t: Task) => (t.subject ? `${t.subject} · ` : '');

/**
 * Semua notifikasi yang harus dijadwalkan ke sistem, dari data sekarang.
 * Dipanggil ulang setiap data berubah: murni, tanpa efek samping.
 */
export function planNotifications(db: DB, now: Date): Planned[] {
  const s = db.settings;
  if (!s.remindersOn) return [];
  const nowMs = now.getTime();
  const out: Planned[] = [];

  for (const t of db.tasks) {
    if (t.done || !t.due) continue;
    const time = t.time || s.defaultTime;
    if (time) {
      const at = atTime(t.due, time);
      if (at !== null && at > nowMs) {
        const key = `t:${t.id}:${t.due}:${time}`;
        out.push({ id: notifId(key), at, title: t.title, body: `${subjectTag(t)}${t.kind === 'bawa' ? 'Bawa · ' : t.kind === 'kumpul' ? 'Kumpul · ' : ''}${t.time ? `Jam ${t.time}` : 'Hari ini'}`, channel: 'noted-tugas', key });
      }
    }
    if (s.dayBefore) {
      const prev = ymd(addDays(new Date(`${t.due}T00:00:00`), -1));
      const at = atTime(prev, s.dayBeforeTime);
      if (at !== null && at > nowMs) {
        const key = `h1:${t.id}:${t.due}`;
        out.push({ id: notifId(key), at, title: `Besok: ${t.title}`, body: `${subjectTag(t)}${t.kind === 'bawa' ? 'Jangan lupa dibawa' : t.kind === 'kumpul' ? 'Jangan lupa dikumpul' : 'Tenggat besok'}`, channel: 'noted-tugas', key });
      }
    }
  }

  if (s.bagOn) {
    const today = startOfDay(now);
    for (let i = 0; i < BAG_DAYS; i++) {
      const day = addDays(today, i);
      const at = atTime(ymd(day), s.bagTime);
      if (at === null || at <= nowMs) continue;
      const tomorrow = addDays(day, 1);
      const bag = buildBag(db.tasks, db.schedule, tomorrow);
      if (bag.subjects.length === 0 && bag.kumpul.length === 0 && bag.bawa.length === 0) continue;
      const key = `bag:${ymd(tomorrow)}`;
      out.push({ id: notifId(key), at, title: `Tas Besok · ${DAYS_ID[tomorrow.getDay()]}`, body: bagBody(bag), largeBody: bagLong(bag), channel: 'noted-tas', key });
    }
  }

  return out.sort((a, b) => a.at - b.at).slice(0, MAX);
}

/** Tanda tangan rencana: bila sama dengan yang terakhir diterapkan, tidak perlu menjadwalkan ulang. */
export const planSignature = (p: Planned[]) => p.map((x) => `${x.id}@${x.at}|${x.title}|${x.body}|${x.largeBody ?? ''}`).join('\n');
