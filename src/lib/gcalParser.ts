import { parseYmd, addDays } from './dates.ts';
import type { GCalEvent, Task } from './model.ts';

export interface RawGoogleEvent {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  updated?: string;
}

function parseDateTimeString(dtString: string): { date: string; time: string } | null {
  if (!dtString) return null;
  // Jika string memiliki format ISO lokal 'YYYY-MM-DDTHH:mm:...'
  const match = dtString.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (match) {
    return { date: match[1], time: match[2] };
  }
  // Fallback via Date parser
  const d = new Date(dtString);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return { date: `${y}-${m}-${day}`, time: `${h}:${min}` };
}

export function parseGoogleEvent(raw: unknown): GCalEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as RawGoogleEvent;
  if (!r.id || r.status === 'cancelled') return null;

  const start = r.start;
  if (!start) return null;

  let date: string;
  let time: string | undefined;
  let endTime: string | undefined;
  let allDay = false;

  if (start.date) {
    if (!parseYmd(start.date)) return null;
    date = start.date;
    allDay = true;
  } else if (start.dateTime) {
    const parsedStart = parseDateTimeString(start.dateTime);
    if (!parsedStart || !parseYmd(parsedStart.date)) return null;
    date = parsedStart.date;
    time = parsedStart.time;

    if (r.end?.dateTime) {
      const parsedEnd = parseDateTimeString(r.end.dateTime);
      if (parsedEnd) endTime = parsedEnd.time;
    }
  } else {
    return null;
  }

  const title = (r.summary && typeof r.summary === 'string' ? r.summary.trim() : '') || 'Acara tanpa judul';
  const location = r.location && typeof r.location === 'string' ? r.location.trim() : undefined;
  const htmlLink = r.htmlLink && typeof r.htmlLink === 'string' ? r.htmlLink : undefined;
  const updatedAt = r.updated && typeof r.updated === 'string' ? r.updated : new Date().toISOString();

  return {
    id: r.id,
    title,
    date,
    time,
    endTime,
    location,
    allDay,
    htmlLink,
    updatedAt,
  };
}

export function parseGoogleEvents(items: unknown[]): GCalEvent[] {
  if (!Array.isArray(items)) return [];
  const list = items.map(parseGoogleEvent).filter((e): e is GCalEvent => e !== null);
  return list.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.allDay !== b.allDay) return Number(!a.allDay) - Number(!b.allDay);
    return (a.time ?? '').localeCompare(b.time ?? '');
  });
}

function computeEndTime(time: string): string {
  const [hStr, mStr] = time.split(':');
  let h = Number(hStr) + 1;
  if (h >= 24) h = 23;
  return `${String(h).padStart(2, '0')}:${mStr}`;
}

export function gcalTemplateUrl(task: Task): string {
  const title = task.title.trim();
  const details = task.subject ? `Mata pelajaran: ${task.subject}\nJenis: ${task.kind}\n(Noted)` : `Jenis: ${task.kind}\n(Noted)`;
  
  let dates = '';
  if (task.due && parseYmd(task.due)) {
    const ymd = task.due.replace(/-/g, '');
    if (task.time && /^\d{1,2}:\d{2}$/.test(task.time)) {
      const startTime = task.time.replace(':', '').padStart(4, '0') + '00';
      const nextTime = computeEndTime(task.time).replace(':', '').padStart(4, '0') + '00';
      dates = `${ymd}T${startTime}/${ymd}T${nextTime}`;
    } else {
      const d = parseYmd(task.due)!;
      const nextDay = addDays(d, 1);
      const nextYmd = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`;
      dates = `${ymd}/${nextYmd}`;
    }
  }

  const p = new URLSearchParams();
  p.set('action', 'TEMPLATE');
  p.set('text', title);
  if (details) p.set('details', details);
  if (dates) p.set('dates', dates);

  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
