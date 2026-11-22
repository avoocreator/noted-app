import { create } from 'zustand';
import { App as CapApp } from '@capacitor/app';
import { createDB, newId, type DB, type Note, type Schedule, type Settings, type Task } from '../lib/model.ts';
import { loadDB, saveDB } from './storage.ts';
import { applyPlan, isNative } from './notify.ts';
import { planNotifications } from '../lib/plan.ts';
import { makeTask, toggleDone, type NewTask } from '../lib/tasks.ts';
import { refreshWidgets } from './widget.ts';
import { initIntentListener } from './intent.ts';

export type Tab = 'week' | 'bag' | 'notes' | 'settings';

interface Toast { id: number; text: string; undo?: () => void }

// State
interface State {
  ready: boolean;
  db: DB;
  tab: Tab;
  openNote: string | null;
  editTask: string | null;
  scheduleOpen: boolean;
  pasteOpen: boolean;
  incomingText: string | null;
  toasts: Toast[];
  lastSaved: number;

  init: () => Promise<void>;
  setTab: (t: Tab) => void;
  setOpenNote: (id: string | null) => void;
  setEditTask: (id: string | null) => void;
  setScheduleOpen: (b: boolean) => void;
  setPasteOpen: (b: boolean) => void;
  setIncomingText: (text: string | null) => void;

  addTask: (p: NewTask) => Task;
  addTasks: (list: NewTask[]) => number;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;

  addNote: (subject?: string) => Note;
  updateNote: (id: string, patch: Partial<Pick<Note, 'title' | 'body' | 'subject'>>) => void;
  removeNote: (id: string) => void;

  setSchedule: (s: Schedule) => void;
  setSettings: (p: Partial<Settings>) => void;
  replaceDB: (db: DB) => void;

  toast: (text: string, undo?: () => void) => void;
  dismissToast: (id: number) => void;
}

let toastId = 1;

// Store
export const useStore = create<State>((set, get) => {
  const mutate = (f: (db: DB) => DB) => set((s) => ({ db: f(s.db) }));
  return {
    ready: false,
    db: createDB(),
    tab: 'week',
    openNote: null,
    editTask: null,
    scheduleOpen: false,
    pasteOpen: false,
    incomingText: null,
    toasts: [],
    lastSaved: 0,

    init: async () => {
      const db = await loadDB();
      set({ db, ready: true });
    },
    setTab: (tab) => set({ tab, openNote: null }),
    setOpenNote: (openNote) => set({ openNote }),
    setEditTask: (editTask) => set({ editTask }),
    setScheduleOpen: (scheduleOpen) => set({ scheduleOpen }),
    setPasteOpen: (pasteOpen) => set((s) => ({ pasteOpen, incomingText: pasteOpen ? s.incomingText : null })),
    setIncomingText: (incomingText) => set({ incomingText }),

    addTask: (p) => {
      const t = makeTask(p);
      mutate((db) => ({ ...db, tasks: [...db.tasks, t] }));
      return t;
    },
    addTasks: (list) => {
      const made = list.filter((p) => p.title.trim()).map((p) => makeTask(p));
      if (made.length) mutate((db) => ({ ...db, tasks: [...db.tasks, ...made] }));
      return made.length;
    },
    updateTask: (id, patch) => mutate((db) => ({ ...db, tasks: db.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    toggleTask: (id) => {
      const t = get().db.tasks.find((x) => x.id === id);
      if (!t) return;
      const r = toggleDone(t);
      mutate((db) => ({ ...db, tasks: [...db.tasks.map((x) => (x.id === id ? r.updated : x)), ...(r.next ? [r.next] : [])] }));
    },
    removeTask: (id) => {
      const t = get().db.tasks.find((x) => x.id === id);
      if (!t) return;
      mutate((db) => ({ ...db, tasks: db.tasks.filter((x) => x.id !== id) }));
      get().toast('Tugas dihapus', () => mutate((db) => (db.tasks.some((x) => x.id === id) ? db : { ...db, tasks: [...db.tasks, t] })));
    },

    addNote: (subject) => {
      const now = new Date().toISOString();
      const n: Note = { id: newId(), title: '', body: '', subject, createdAt: now, updatedAt: now };
      mutate((db) => ({ ...db, notes: [n, ...db.notes] }));
      return n;
    },
    updateNote: (id, patch) => mutate((db) => ({ ...db, notes: db.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)) })),
    removeNote: (id) => {
      const n = get().db.notes.find((x) => x.id === id);
      if (!n) return;
      mutate((db) => ({ ...db, notes: db.notes.filter((x) => x.id !== id) }));
      get().toast('Catatan dihapus', () => mutate((db) => (db.notes.some((x) => x.id === id) ? db : { ...db, notes: [n, ...db.notes] })));
    },

    setSchedule: (schedule) => mutate((db) => ({ ...db, schedule })),
    setSettings: (p) => mutate((db) => ({ ...db, settings: { ...db.settings, ...p } })),
    replaceDB: (db) => set({ db, openNote: null, editTask: null }),

    toast: (text, undo) => {
      const id = toastId++;
      set((s) => ({ toasts: [...s.toasts, { id, text, undo }] }));
      setTimeout(() => get().dismissToast(id), undo ? 6000 : 2800);
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});

// Auto-save
let saveTimer: ReturnType<typeof setTimeout> | number | undefined;
let planTimer: ReturnType<typeof setTimeout> | number | undefined;
let prevDB: DB | null = null;

function flush() {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  void saveDB(useStore.getState().db).then(() => { useStore.setState({ lastSaved: Date.now() }); void refreshWidgets(); });
}
function replan(force = false) {
  clearTimeout(planTimer);
  planTimer = setTimeout(() => void applyPlan(planNotifications(useStore.getState().db, new Date()), force), force ? 0 : 1200);
}

export async function syncFromDisk(): Promise<boolean> {
  const disk = await loadDB();
  const current = useStore.getState().db;
  if (disk.rev <= current.rev) return false;
  prevDB = disk;
  useStore.setState({ db: disk });
  replan();
  return true;
}

// Bootstrap
export async function bootstrap(): Promise<void> {
  await useStore.getState().init();
  prevDB = useStore.getState().db;
  useStore.subscribe((s) => {
    if (!s.ready || !prevDB || s.db === prevDB) return;
    const tasksOrPlan = s.db.tasks !== prevDB.tasks || s.db.schedule !== prevDB.schedule || s.db.settings !== prevDB.settings;
    prevDB = s.db;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 400);
    if (tasksOrPlan) replan();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { if (saveTimer !== undefined) flush(); }
    else void syncFromDisk();
  });
  if (isNative()) {
    void CapApp.addListener('appStateChange', (st) => {
      if (!st.isActive && saveTimer !== undefined) flush();
    });
  }
  replan(true);
  void refreshWidgets();
  void initIntentListener((text) => {
    useStore.setState({ incomingText: text, pasteOpen: true });
  });
}
