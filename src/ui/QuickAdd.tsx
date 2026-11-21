import { useMemo, useState, type FormEvent } from 'react';
import { dueLabel } from '../lib/dates.ts';
import { parseTask } from '../lib/parse.ts';
import { knownSubjects } from '../lib/schedule.ts';
import { COMMON_SUBJECTS, sameSubject } from '../lib/subjects.ts';
import { subjectCounts } from '../lib/week.ts';
import { useStore } from '../data/store.ts';
import { Icon } from './Icon.tsx';

export function QuickAdd() {
  const db = useStore((s) => s.db);
  const addTask = useStore((s) => s.addTask);
  const toast = useStore((s) => s.toast);
  const [text, setText] = useState('');
  const [subject, setSubject] = useState<string | null>(null);

  const known = useMemo(() => {
    const list = [...knownSubjects(db.schedule), ...subjectCounts(db.tasks).map(([s]) => s)];
    return list.filter((s, i) => list.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i);
  }, [db.schedule, db.tasks]);
  const chips = (known.length >= 4 ? known : [...known, ...COMMON_SUBJECTS.filter((c) => !known.some((k) => sameSubject(k, c)))]).slice(0, 8);
  const parsed = useMemo(() => (text.trim() ? parseTask(text, { schedule: db.schedule, subjects: known }) : null), [text, db.schedule, known]);
  const effSubject = subject ?? parsed?.subject ?? null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!parsed || !parsed.title) return;
    addTask({ title: parsed.title, due: parsed.due, time: parsed.time, subject: effSubject ?? undefined, kind: parsed.kind, priority: parsed.priority, recur: parsed.recur });
    toast(parsed.due ? `Tugas ditambahkan · ${dueLabel(parsed.due, new Date())}` : 'Tugas ditambahkan');
    setText(''); setSubject(null);
  };

  return (
    <div className="quick-wrap">
      <form className="quick" onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Tambah tugas… misalnya: PR mtk hal 45 jumat" aria-label="Tambah tugas" enterKeyHint="done" />
        <button className="btn primary" type="submit" disabled={!parsed?.title}><Icon name="plus" size={18} /> Tambah</button>
      </form>
      {parsed && (
        <div className="preview" aria-live="polite">
          {parsed.due ? <i className="when"><Icon name="calendar" size={12} /> {dueLabel(parsed.due, new Date())}{parsed.time ? ` · ${parsed.time}` : ''}</i> : <i className="when dim">tanpa tanggal</i>}
          {parsed.kind !== 'tugas' && <i className={'tag ' + parsed.kind}>{parsed.kind === 'kumpul' ? 'Kumpul' : 'Bawa'}</i>}
          {parsed.meeting && !parsed.due && <i className="when dim">tambahkan mapel ke jadwal agar "pertemuan berikutnya" dikenali</i>}
        </div>
      )}
      <div className="chips" role="group" aria-label="Mata pelajaran">
        {chips.map((c) => {
          const on = sameSubject(c, effSubject);
          return <button key={c} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => setSubject(on ? null : c)}>{c}</button>;
        })}
      </div>
    </div>
  );
}
