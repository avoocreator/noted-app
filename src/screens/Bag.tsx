import { useMemo, useState, type FormEvent } from 'react';
import { addDays, longDay } from '../lib/dates.ts';
import { buildBag } from '../lib/bag.ts';
import { hasSchedule } from '../lib/schedule.ts';
import type { Task } from '../lib/model.ts';
import { useStore } from '../data/store.ts';
import { Icon } from '../ui/Icon.tsx';

const byOpen = (a: Task, b: Task) => Number(a.done) - Number(b.done) || (a.time ?? '99').localeCompare(b.time ?? '99') || a.createdAt.localeCompare(b.createdAt);

/** Ritual malam: apa yang harus dikumpul dan dibawa besok. */
export function Bag() {
  const db = useStore((s) => s.db);
  const toggle = useStore((s) => s.toggleTask);
  const edit = useStore((s) => s.setEditTask);
  const addTask = useStore((s) => s.addTask);
  const setScheduleOpen = useStore((s) => s.setScheduleOpen);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<'bawa' | 'kumpul'>('bawa');

  const tomorrow = addDays(new Date(), 1);
  const bag = useMemo(() => buildBag(db.tasks, db.schedule, tomorrow), [db.tasks, db.schedule]);
  const items = useMemo(() => db.tasks.filter((t) => t.due === bag.date), [db.tasks, bag.date]);
  const kumpul = items.filter((t) => t.kind !== 'bawa').sort(byOpen);
  const bawa = items.filter((t) => t.kind === 'bawa').sort(byOpen);
  const scheduled = hasSchedule(db.schedule);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addTask({ title: text.trim(), due: bag.date, kind });
    setText('');
  };

  const list = (title: string, tasks: Task[]) => tasks.length > 0 && (
    <section className="group">
      <h3>{title} <i>{tasks.filter((t) => !t.done).length}/{tasks.length}</i></h3>
      <ul className="tasks">
        {tasks.map((t) => (
          <li key={t.id} className={'task' + (t.done ? ' done' : '')}>
            <button className={'check' + (t.done ? ' on' : '')} aria-label={t.done ? 'Batalkan' : 'Sudah masuk tas'} aria-pressed={t.done} onClick={() => toggle(t.id)}>{t.done && <Icon name="check" size={16} strokeWidth={3} />}</button>
            <button className="task-main" onClick={() => edit(t.id)}>
              <span className="task-title">{t.title}</span>
              {(t.subject || t.time) && <span className="meta">{t.subject && <i className="tag subj">{t.subject}</i>}{t.time && <i className="when"><Icon name="clock" size={12} /> {t.time}</i>}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <main className="screen">
      <header className="head">
        <div>
          <h1>Tas Besok</h1>
          <p className="muted">{longDay(tomorrow)}</p>
        </div>
        <button className="btn soft" onClick={() => setScheduleOpen(true)}><Icon name="calendar" size={18} /> Jadwal</button>
      </header>

      {bag.ready && (
        <div className="ready" role="status"><Icon name="check" size={22} strokeWidth={3} /> <b>Tas siap</b> <span>Semua sudah disiapkan untuk besok.</span></div>
      )}

      {!scheduled && (
        <div className="callout">
          <span>Isi jadwal pelajaran sekali (kurang dari 2 menit) supaya Noted tahu pelajaran apa besok.</span>
          <button className="btn primary" onClick={() => setScheduleOpen(true)}>Atur jadwal</button>
        </div>
      )}

      {bag.subjects.length > 0 && (
        <section className="group">
          <h3>Pelajaran besok <i>{bag.subjects.length}</i></h3>
          <div className="chips static">{bag.subjects.map((s) => <span key={s} className="chip">{s}</span>)}</div>
        </section>
      )}
      {scheduled && bag.subjects.length === 0 && <p className="muted">Tidak ada pelajaran di jadwal untuk {bag.dayName}.</p>}

      {list('Kumpul', kumpul)}
      {list('Bawa', bawa)}

      {items.length === 0 && (
        <div className="empty small">
          <h2>Belum ada yang perlu disiapkan</h2>
          <p className="muted">Tambahkan barang yang harus dibawa atau tugas yang dikumpul besok.</p>
        </div>
      )}

      <form className="quick" onSubmit={add}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === 'bawa' ? 'Tambah barang yang dibawa…' : 'Tambah tugas yang dikumpul…'} aria-label="Tambah untuk besok" />
        <div className="seg compact" role="radiogroup" aria-label="Jenis">
          <button type="button" role="radio" aria-checked={kind === 'bawa'} className={kind === 'bawa' ? 'on' : ''} onClick={() => setKind('bawa')}>Bawa</button>
          <button type="button" role="radio" aria-checked={kind === 'kumpul'} className={kind === 'kumpul' ? 'on' : ''} onClick={() => setKind('kumpul')}>Kumpul</button>
        </div>
        <button className="btn primary" type="submit" disabled={!text.trim()}><Icon name="plus" size={18} /></button>
      </form>
      <p className="muted small">Notifikasi Tas Besok datang tiap malam pukul {db.settings.bagTime}{db.settings.bagOn ? '' : ' (sedang dimatikan)'}. Ubah di Pengaturan.</p>
    </main>
  );
}
