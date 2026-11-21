import { addDays, ymd } from './dates.ts';
import type { Task } from './model.ts';
import { sameSubject } from './subjects.ts';

// Types
export type GroupId = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'nodate';
export interface Group { id: GroupId; label: string; items: Task[] }

// Grouping
const ORDER: { id: GroupId; label: string }[] = [
  { id: 'overdue', label: 'Terlambat' },
  { id: 'today', label: 'Hari ini' },
  { id: 'tomorrow', label: 'Besok' },
  { id: 'week', label: 'Minggu ini' },
  { id: 'later', label: 'Nanti' },
  { id: 'nodate', label: 'Tanpa tanggal' },
];
const PRI = { high: 0, medium: 1, low: 2 } as const;

export const groupOf = (t: Task, now: Date): GroupId => {
  if (!t.due) return 'nodate';
  const today = ymd(now);
  if (t.due < today) return 'overdue';
  if (t.due === today) return 'today';
  if (t.due === ymd(addDays(now, 1))) return 'tomorrow';
  return t.due <= ymd(addDays(now, 7)) ? 'week' : 'later';
};

export function compareTasks(a: Task, b: Task): number {
  return (a.due ?? '9').localeCompare(b.due ?? '9') || (a.time ?? '99').localeCompare(b.time ?? '99') || PRI[a.priority ?? 'low'] - PRI[b.priority ?? 'low'] || a.createdAt.localeCompare(b.createdAt);
}

export function groupTasks(tasks: Task[], now: Date, subject?: string | null): Group[] {
  const by = new Map<GroupId, Task[]>();
  for (const t of tasks) {
    if (t.done) continue;
    if (subject && !sameSubject(t.subject, subject)) continue;
    const g = groupOf(t, now);
    by.set(g, [...(by.get(g) ?? []), t]);
  }
  return ORDER.map((o) => ({ ...o, items: (by.get(o.id) ?? []).sort(compareTasks) })).filter((g) => g.items.length > 0);
}

export function subjectCounts(tasks: Task[]): [string, number][] {
  const m = new Map<string, number>();
  for (const t of tasks) if (!t.done && t.subject) m.set(t.subject, (m.get(t.subject) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
