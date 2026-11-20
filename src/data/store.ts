import { create } from 'zustand';
import { App as CapApp } from '@capacitor/app';
import { createDB, newId, type DB, type Note, type Schedule, type Settings, type Task } from '../lib/model.ts';
import { loadDB, saveDB } from './storage.ts';
import { applyPlan, isNative } from './notify.ts';
import { planNotifications } from '../lib/plan.ts';
import { makeTask, toggleDone, type NewTask } from '../lib/tasks.ts';
import { refreshWidgets } from './widget.ts';

export type Tab = 'week' | 'bag' | 'notes' | 'settings';

interface Toast { id: number; text: string; undo?: () => void }

interface State {
  ready: boolean;
  db: DB;
  tab: Tab;
  /** id catatan yang sedang dibuka, atau null */
  openNote: string | null;
  /** id tugas yang sedang diedit, atau null */
  editTask: string | null;
  scheduleOpen: boolean;
  pasteOpen: boolean;
  toasts: Toast[];
  lastSaved: number;

  init: () => Promise<void>;
  setTab: (t: Tab) => void;
  setOpenNote: (id: string | null) => void;
  setEditTask: (id: string | null) => void;
  setScheduleOpen: (b: boolean) => void;
  setPasteOpen: (b: boolean) => void;

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
    setPasteOpen: (pasteOpen) => set({ pasteOpen }),

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
      window.setTimeout(() => get().dismissToast(id), undo ? 6000 : 2800);
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});

/* ── penyimpanan otomatis + penjadwalan notifikasi ─────────────────────────────────────── */
let saveTimer: number | undefined;
let planTimer: number | undefined;

function flush() {
  window.clearTimeout(saveTimer);
  saveTimer = undefined;
  void saveDB(useStore.getState().db).then(() => { useStore.setState({ lastSaved: Date.now() }); void refreshWidgets(); });
}
function replan(force = false) {
  window.clearTimeout(planTimer);
  planTimer = window.setTimeout(() => void applyPlan(planNotifications(useStore.getState().db, new Date()), force), force ? 0 : 1200);
}

/** Dipanggil sekali saat aplikasi mulai. */
export async function bootstrap(): Promise<void> {
  await useStore.getState().init();
  let prev = useStore.getState().db;
  useStore.subscribe((s) => {
    if (!s.ready || s.db === prev) return;
    const tasksOrPlan = s.db.tasks !== prev.tasks || s.db.schedule !== prev.schedule || s.db.settings !== prev.settings;
    prev = s.db;
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(flush, 400);
    if (tasksOrPlan) replan();
  });
  // simpan segera bila aplikasi masuk latar belakang; jadwalkan ulang saat dibuka lagi (jendela Tas Besok bergeser)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { if (saveTimer !== undefined) flush(); }
    else replan();
  });
  if (isNative()) {
    void CapApp.addListener('appStateChange', (st) => { if (!st.isActive && saveTimer !== undefined) flush(); if (st.isActive) replan(); });
  }
  replan(true);
  void refreshWidgets();
}
