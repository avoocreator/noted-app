import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useStore, syncFromDisk } from './data/store.ts';
import { TabBar } from './ui/TabBar.tsx';
import { Toasts } from './ui/Toasts.tsx';
import { Week } from './screens/Week.tsx';
import { Bag } from './screens/Bag.tsx';
import { Notes } from './screens/Notes.tsx';
import { Settings } from './screens/Settings.tsx';
import { TaskSheet } from './screens/TaskSheet.tsx';
import { PasteSheet } from './screens/PasteSheet.tsx';
import { ScheduleEditor } from './screens/ScheduleEditor.tsx';
import { NoteEditor } from './screens/NoteEditor.tsx';

export function App() {
  const ready = useStore((s) => s.ready);
  const tab = useStore((s) => s.tab);
  const theme = useStore((s) => s.db.settings.theme);
  const accent = useStore((s) => s.db.settings.accent);
  const editTask = useStore((s) => s.editTask);
  const pasteOpen = useStore((s) => s.pasteOpen);
  const scheduleOpen = useStore((s) => s.scheduleOpen);
  const openNote = useStore((s) => s.openNote);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.accent = accent;
  }, [theme, accent]);

  // Back button
  useEffect(() => {
    const sub = CapApp.addListener('backButton', () => {
      const s = useStore.getState();
      if (s.editTask) s.setEditTask(null);
      else if (s.pasteOpen) s.setPasteOpen(false);
      else if (s.scheduleOpen) s.setScheduleOpen(false);
      else if (s.openNote) s.setOpenNote(null);
      else if (s.tab !== 'week') s.setTab('week');
      else void CapApp.exitApp();
    });
    return () => { void sub.then((h) => h.remove()); };
  }, []);

  useEffect(() => {
    const sub = CapApp.addListener('appStateChange', (st) => {
      if (st.isActive) void syncFromDisk();
    });
    return () => { void sub.then((h) => h.remove()); };
  }, []);

  if (!ready) return <div className="boot" aria-busy="true">Noted</div>;
  return (
    <div className="app">
      {tab === 'week' && <Week />}
      {tab === 'bag' && <Bag />}
      {tab === 'notes' && <Notes />}
      {tab === 'settings' && <Settings />}
      <TabBar />
      {editTask && <TaskSheet key={editTask} id={editTask} />}
      {pasteOpen && <PasteSheet />}
      {scheduleOpen && <ScheduleEditor />}
      {openNote && <NoteEditor key={openNote} id={openNote} />}
      <Toasts />
    </div>
  );
}
