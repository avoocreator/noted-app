import { useState } from 'react';
import { knownSubjects } from '../lib/schedule.ts';
import type { Recur, TaskKind } from '../lib/model.ts';
import { useStore } from '../data/store.ts';
import { Sheet } from '../ui/Sheet.tsx';
import { Icon } from '../ui/Icon.tsx';

export function TaskSheet({ id }: { id: string }) {
  const task = useStore((s) => s.db.tasks.find((t) => t.id === id));
  const schedule = useStore((s) => s.db.schedule);
  const update = useStore((s) => s.updateTask);
  const remove = useStore((s) => s.removeTask);
  const close = () => useStore.getState().setEditTask(null);

  const [title, setTitle] = useState(task?.title ?? '');
  const [due, setDue] = useState(task?.due ?? '');
  const [time, setTime] = useState(task?.time ?? '');
  const [subject, setSubject] = useState(task?.subject ?? '');
  const [kind, setKind] = useState<TaskKind>(task?.kind ?? 'tugas');
  const [high, setHigh] = useState(task?.priority === 'high');
  const [recur, setRecur] = useState<Recur | ''>(task?.recur ?? '');

  if (!task) return null;
  const save = () => {
    if (!title.trim()) return;
    update(id, { title: title.trim(), due: due || undefined, time: time || undefined, subject: subject.trim() || undefined, kind, priority: high ? 'high' : undefined, recur: recur || undefined });
    close();
  };

  return (
    <Sheet title="Ubah tugas" onClose={close}>
      <label className="field"><span>Tugas</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <div className="grid2">
        <label className="field"><span>Tenggat</span><input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
        <label className="field"><span>Jam (opsional)</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      </div>
      <label className="field"><span>Mata pelajaran</span>
        <input list="subjects-list" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Matematika" />
        <datalist id="subjects-list">{knownSubjects(schedule).map((s) => <option key={s} value={s} />)}</datalist>
      </label>
      <div className="field"><span>Jenis</span>
        <div className="seg" role="radiogroup" aria-label="Jenis">
          {([['tugas', 'Tugas'], ['kumpul', 'Kumpul'], ['bawa', 'Bawa']] as const).map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="grid2">
        <label className="field"><span>Ulangi</span>
          <select value={recur} onChange={(e) => setRecur(e.target.value as Recur | '')}>
            <option value="">Tidak</option><option value="day">Tiap hari</option><option value="week">Tiap minggu</option><option value="month">Tiap bulan</option>
          </select>
        </label>
        <label className="field check-field"><span>Penting</span>
          <button type="button" role="switch" aria-checked={high} className={'switch' + (high ? ' on' : '')} onClick={() => setHigh(!high)}><i /></button>
        </label>
      </div>
      <div className="row between">
        <button className="btn danger-btn" onClick={() => { remove(id); close(); }}><Icon name="trash" size={18} /> Hapus</button>
        <button className="btn primary" onClick={save} disabled={!title.trim()}>Simpan</button>
      </div>
    </Sheet>
  );
}
