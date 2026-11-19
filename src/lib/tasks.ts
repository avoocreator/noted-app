import { addDays, addMonths, parseYmd, startOfDay, ymd } from './dates.ts';
import { newId, type Recur, type Task } from './model.ts';

export type NewTask = Partial<Omit<Task, 'id' | 'createdAt' | 'done'>> & { title: string };

export function makeTask(p: NewTask, now = new Date()): Task {
  return {
    id: newId(),
    title: p.title.trim(),
    due: p.due || undefined,
    time: p.time || undefined,
    subject: p.subject?.trim() || undefined,
    kind: p.kind ?? 'tugas',
    priority: p.priority,
    recur: p.recur,
    done: false,
    createdAt: now.toISOString(),
  };
}

function advance(due: string, recur: Recur): string {
  const d = parseYmd(due) ?? new Date();
  return ymd(recur === 'day' ? addDays(d, 1) : recur === 'week' ? addDays(d, 7) : addMonths(d, 1));
}

/** Centang/batalkan. Tugas berulang yang diselesaikan menghasilkan tugas berikutnya. */
export function toggleDone(t: Task, now = new Date()): { updated: Task; next?: Task } {
  if (t.done) return { updated: { ...t, done: false, doneAt: undefined } };
  const updated: Task = { ...t, done: true, doneAt: now.toISOString() };
  if (!t.recur) return { updated };
  const today = ymd(startOfDay(now));
  let due = advance(t.due ?? today, t.recur);
  for (let i = 0; i < 400 && due < today; i++) due = advance(due, t.recur);
  return { updated, next: { ...t, id: newId(), due, done: false, doneAt: undefined, createdAt: now.toISOString() } };
}
