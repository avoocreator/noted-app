import { useMemo, useState } from 'react';
import { filterNotes, noteHeading, snippet } from '../lib/notes.ts';
import { sameSubject } from '../lib/subjects.ts';
import { useStore } from '../data/store.ts';
import { Icon } from '../ui/Icon.tsx';

export function Notes() {
  const notes = useStore((s) => s.db.notes);
  const addNote = useStore((s) => s.addNote);
  const open = useStore((s) => s.setOpenNote);
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState<string | null>(null);

  const subjects = useMemo(() => [...new Set(notes.map((n) => n.subject).filter((s): s is string => !!s))], [notes]);
  const shown = useMemo(() => filterNotes(notes, q, subject), [notes, q, subject]);

  return (
    <main className="screen">
      <header className="head">
        <div><h1>Catatan</h1><p className="muted">{notes.length} catatan</p></div>
        <button className="btn primary" onClick={() => open(addNote(subject ?? undefined).id)}><Icon name="plus" size={18} /> Catatan baru</button>
      </header>
      {notes.length > 0 && (
        <label className="search"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari catatan" aria-label="Cari catatan" /></label>
      )}
      {subjects.length > 1 && (
        <div className="chips" role="group" aria-label="Saring mapel">
          {subjects.map((s) => <button key={s} className={'chip' + (sameSubject(s, subject) ? ' on' : '')} aria-pressed={sameSubject(s, subject)} onClick={() => setSubject(sameSubject(s, subject) ? null : s)}>{s}</button>)}
        </div>
      )}
      {notes.length === 0 ? (
        <div className="empty">
          <div className="empty-ico"><Icon name="notes" size={34} /></div>
          <h2>Belum ada catatan</h2>
          <p className="muted">Untuk ringkasan pelajaran, daftar belanja tugas, atau apa pun yang perlu diingat.</p>
        </div>
      ) : shown.length === 0 ? <p className="muted">Tidak ada catatan yang cocok.</p> : (
        <ul className="notes">
          {shown.map((n) => (
            <li key={n.id}><button className="note-card" onClick={() => open(n.id)}>
              <b>{noteHeading(n)}</b>
              {snippet(n) && <span>{snippet(n)}</span>}
              {n.subject && <i className="tag subj">{n.subject}</i>}
            </button></li>
          ))}
        </ul>
      )}
    </main>
  );
}
