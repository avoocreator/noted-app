import { parseYmd } from './dates.ts';

// Types
export type TaskKind = 'tugas' | 'kumpul' | 'bawa';
export type Priority = 'high' | 'medium' | 'low';
export type Recur = 'day' | 'week' | 'month';

export interface Task {
  id: string;
  title: string;
  due?: string;
  time?: string;
  subject?: string;
  kind: TaskKind;
  priority?: Priority;
  recur?: Recur;
  done: boolean;
  doneAt?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  subject?: string;
  createdAt: string;
  updatedAt: string;
}

export type Schedule = string[][];

export type ThemeMode = 'auto' | 'light' | 'dark';
export type Accent = 'indigo' | 'green' | 'orange' | 'pink';

export interface GCalEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  location?: string;
  allDay: boolean;
  htmlLink?: string;
  updatedAt: string;
}

export interface Settings {
  remindersOn: boolean;
  defaultTime: string;
  dayBefore: boolean;
  dayBeforeTime: string;
  bagOn: boolean;
  bagTime: string;
  theme: ThemeMode;
  accent: Accent;
  lastBackup?: string;
  gcalEnabled: boolean;
  gcalAutoSync: boolean;
  gcalLastSync?: string;
}

export interface DB {
  v: 1;
  rev: number;
  tasks: Task[];
  notes: Note[];
  schedule: Schedule;
  gcalEvents: GCalEvent[];
  settings: Settings;
}

// Defaults
export const emptySchedule = (): Schedule => Array.from({ length: 7 }, () => [] as string[]);

export const defaultSettings = (): Settings => ({
  remindersOn: true,
  defaultTime: '08:00',
  dayBefore: true,
  dayBeforeTime: '18:00',
  bagOn: true,
  bagTime: '19:30',
  theme: 'auto',
  accent: 'pink',
  gcalEnabled: false,
  gcalAutoSync: true,
});

export const createDB = (): DB => ({ v: 1, rev: 0, tasks: [], notes: [], schedule: emptySchedule(), gcalEvents: [], settings: defaultSettings() });

export function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

const str = (x: unknown, max = 2000): string | undefined => (typeof x === 'string' && x.length <= max ? x : undefined);
const oneOf = <T extends string>(x: unknown, list: readonly T[]): T | undefined => (typeof x === 'string' && (list as readonly string[]).includes(x) ? (x as T) : undefined);
const TIME = /^\d{1,2}:\d{2}$/;

function coerceTask(x: unknown): Task | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const id = str(r.id, 100);
  const title = str(r.title, 500);
  if (!id || !title) return null;
  const due = typeof r.due === 'string' && parseYmd(r.due) ? r.due : undefined;
  const time = typeof r.time === 'string' && TIME.test(r.time) ? r.time : undefined;
  return {
    id, title, due, time,
    subject: str(r.subject, 60),
    kind: oneOf(r.kind, ['tugas', 'kumpul', 'bawa'] as const) ?? 'tugas',
    priority: oneOf(r.priority, ['high', 'medium', 'low'] as const),
    recur: oneOf(r.recur, ['day', 'week', 'month'] as const),
    done: r.done === true,
    doneAt: str(r.doneAt, 40),
    createdAt: str(r.createdAt, 40) ?? new Date().toISOString(),
  };
}

function coerceNote(x: unknown): Note | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const id = str(r.id, 100);
  if (!id) return null;
  const now = new Date().toISOString();
  return { id, title: str(r.title, 300) ?? '', body: str(r.body, 500_000) ?? '', subject: str(r.subject, 60), createdAt: str(r.createdAt, 40) ?? now, updatedAt: str(r.updatedAt, 40) ?? now };
}

function coerceSchedule(x: unknown): Schedule {
  const out = emptySchedule();
  if (!Array.isArray(x)) return out;
  for (let i = 0; i < 7; i++) {
    const day = x[i];
    if (Array.isArray(day)) out[i] = day.filter((s): s is string => typeof s === 'string' && s.trim().length > 0 && s.length <= 40).slice(0, 20).map((s) => s.trim());
  }
  return out;
}

function coerceGCalEvent(x: unknown): GCalEvent | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const id = str(r.id, 200);
  const title = str(r.title, 500);
  const date = typeof r.date === 'string' && parseYmd(r.date) ? r.date : undefined;
  if (!id || !title || !date) return null;
  const time = typeof r.time === 'string' && TIME.test(r.time) ? r.time : undefined;
  const endTime = typeof r.endTime === 'string' && TIME.test(r.endTime) ? r.endTime : undefined;
  return {
    id, title, date, time, endTime,
    location: str(r.location, 300),
    allDay: r.allDay === true,
    htmlLink: str(r.htmlLink, 1000),
    updatedAt: str(r.updatedAt, 40) ?? new Date().toISOString(),
  };
}

// Migration
export function migrate(raw: unknown): DB {
  const base = createDB();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const s = (r.settings && typeof r.settings === 'object' ? r.settings : {}) as Record<string, unknown>;
  const d = base.settings;
  const time = (x: unknown, fallback: string, allowEmpty = false) => (typeof x === 'string' && (TIME.test(x) || (allowEmpty && x === '')) ? x : fallback);
  return {
    v: 1,
    rev: typeof r.rev === 'number' && Number.isFinite(r.rev) ? r.rev : 0,
    tasks: Array.isArray(r.tasks) ? r.tasks.map(coerceTask).filter((t): t is Task => t !== null) : [],
    notes: Array.isArray(r.notes) ? r.notes.map(coerceNote).filter((n): n is Note => n !== null) : [],
    schedule: coerceSchedule(r.schedule),
    gcalEvents: Array.isArray(r.gcalEvents) ? r.gcalEvents.map(coerceGCalEvent).filter((e): e is GCalEvent => e !== null) : [],
    settings: {
      remindersOn: typeof s.remindersOn === 'boolean' ? s.remindersOn : d.remindersOn,
      defaultTime: time(s.defaultTime, d.defaultTime, true),
      dayBefore: typeof s.dayBefore === 'boolean' ? s.dayBefore : d.dayBefore,
      dayBeforeTime: time(s.dayBeforeTime, d.dayBeforeTime),
      bagOn: typeof s.bagOn === 'boolean' ? s.bagOn : d.bagOn,
      bagTime: time(s.bagTime, d.bagTime),
      theme: oneOf(s.theme, ['auto', 'light', 'dark'] as const) ?? d.theme,
      accent: oneOf(s.accent, ['indigo', 'green', 'orange', 'pink'] as const) ?? d.accent,
      lastBackup: str(s.lastBackup, 40),
      gcalEnabled: typeof s.gcalEnabled === 'boolean' ? s.gcalEnabled : d.gcalEnabled,
      gcalAutoSync: typeof s.gcalAutoSync === 'boolean' ? s.gcalAutoSync : d.gcalAutoSync,
      gcalLastSync: str(s.gcalLastSync, 40),
    },
  };
}
