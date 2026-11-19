import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { continueList, flipCheck, toggleLinePrefix } from '../lib/notes.ts';
import { knownSubjects } from '../lib/schedule.ts';
import { useStore } from '../data/store.ts';
import { Icon } from '../ui/Icon.tsx';

/** Posisi baris yang berisi kursor: [awal, akhir) */
function lineAt(text: string, pos: number): [number, number] {
  const s = text.lastIndexOf('\n', pos - 1) + 1;
  const e = text.indexOf('\n', pos);
  return [s, e === -1 ? text.length : e];
}

export function NoteEditor({ id }: { id: string }) {
  const note = useStore((s) => s.db.notes.find((n) => n.id === id));
  const schedule = useStore((s) => s.db.schedule);
  const lastSaved = useStore((s) => s.lastSaved);
  const update = useStore((s) => s.updateNote);
  const remove = useStore((s) => s.removeNote);
  const close = () => useStore.getState().setOpenNote(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [subject, setSubject] = useState(note?.subject ?? '');
  const [touched, setTouched] = useState(false);

  // simpan otomatis setelah berhenti mengetik
  useEffect(() => {
    if (!touched) return;
    const t = setTimeout(() => update(id, { title, body, subject: subject.trim() || undefined }), 500);
    return () => clearTimeout(t);
  }, [title, body, subject, touched, id, update]);

  // catatan kosong yang ditinggalkan dibuang
  useEffect(() => () => {
    const n = useStore.getState().db.notes.find((x) => x.id === id);
    if (n && !n.title.trim() && !n.body.trim()) useStore.setState((s) => ({ db: { ...s.db, notes: s.db.notes.filter((x) => x.id !== id) } }));
  }, [id]);

  if (!note) return null;
  const saved = touched ? lastSaved >= new Date(note.updatedAt).getTime() && note.title === title && note.body === body : true;

  const edit = (next: string, caret: number) => {
    setBody(next); setTouched(true);
    requestAnimationFrame(() => { const a = area.current; if (a) { a.focus(); a.setSelectionRange(caret, caret); } });
  };
  const format = (kind: 'bullet' | 'number' | 'check') => {
    const a = area.current; if (!a) return;
    const [s, e] = lineAt(body, a.selectionStart);
    const line = toggleLinePrefix(body.slice(s, e), kind);
    edit(body.slice(0, s) + line + body.slice(e), s + line.length);
  };
  const flip = () => {
    const a = area.current; if (!a) return;
    const [s, e] = lineAt(body, a.selectionStart);
    const line = flipCheck(body.slice(s, e));
    edit(body.slice(0, s) + line + body.slice(e), a.selectionStart);
  };
  const onKey = (ev: KeyboardEvent<HTMLTextAreaElement>) => {
    if (ev.key !== 'Enter' || ev.shiftKey) return;
    const a = ev.currentTarget;
    if (a.selectionStart !== a.selectionEnd) return;
    const pos = a.selectionStart;
    const [s, e] = lineAt(body, pos);
    const line = body.slice(s, e);
    if (!/^\s*(•|☐|☑|\d+\.)\s/.test(line)) return;
    ev.preventDefault();
    const next = continueList(line);
    if (next === '') { edit(body.slice(0, s) + body.slice(e), s); return; } // baris daftar kosong → keluar dari daftar
    const ins = '\n' + next;
    edit(body.slice(0, pos) + ins + body.slice(pos), pos + ins.length);
  };

  return (
    <div className="editor" role="dialog" aria-modal="true" aria-label="Catatan">
      <header className="editor-head">
        <button className="icon-btn" aria-label="Kembali" onClick={close}><Icon name="back" /></button>
        <span className="muted grow">{saved ? 'Tersimpan ✓' : 'Menyimpan…'}</span>
        <button className="icon-btn" aria-label="Hapus catatan" onClick={() => { remove(id); close(); }}><Icon name="trash" /></button>
      </header>
      <input className="editor-title" value={title} onChange={(e) => { setTitle(e.target.value); setTouched(true); }} placeholder="Judul" aria-label="Judul" />
      <div className="editor-sub">
        <input list="note-subjects" value={subject} onChange={(e) => { setSubject(e.target.value); setTouched(true); }} placeholder="Mapel (opsional)" aria-label="Mata pelajaran" />
        <datalist id="note-subjects">{knownSubjects(schedule).map((s) => <option key={s} value={s} />)}</datalist>
      </div>
      <textarea ref={area} className="editor-body" value={body} onChange={(e) => { setBody(e.target.value); setTouched(true); }} onKeyDown={onKey} placeholder="Tulis di sini…" aria-label="Isi catatan" />
      <div className="toolbar" role="toolbar" aria-label="Format">
        <button onClick={() => format('bullet')} aria-label="Poin"><Icon name="list" /></button>
        <button onClick={() => format('number')} aria-label="Nomor"><Icon name="listOl" /></button>
        <button onClick={() => format('check')} aria-label="Daftar centang"><Icon name="checkSq" /></button>
        <button onClick={flip} aria-label="Centang atau batalkan baris ini"><Icon name="check" /></button>
      </div>
    </div>
  );
}
