import { useMemo, useState } from 'react';
import { greeting, longDay } from '../lib/dates.ts';
import { backupNudge } from '../lib/backup.ts';
import { groupTasks, subjectCounts } from '../lib/week.ts';
import { sameSubject } from '../lib/subjects.ts';
import { useStore } from '../data/store.ts';
import { Icon } from '../ui/Icon.tsx';
import { QuickAdd } from '../ui/QuickAdd.tsx';
import { TaskRow } from '../ui/TaskRow.tsx';

const NODATE_LIMIT = 5;

/** Layar awal: tugas yang perlu dikerjakan, urut tenggat. */
export function Week() {
  const db = useStore((s) => s.db);
  const setPasteOpen = useStore((s) => s.setPasteOpen);
  const setTab = useStore((s) => s.setTab);
  const [filter, setFilter] = useState<string | null>(null);
  const [allNoDate, setAllNoDate] = useState(false);
  const now = new Date();

  const groups = useMemo(() => groupTasks(db.tasks, new Date(), filter), [db.tasks, filter]);
  const subjects = useMemo(() => subjectCounts(db.tasks).slice(0, 10), [db.tasks]);
  const open = db.tasks.filter((t) => !t.done);
  const todayN = groups.find((g) => g.id === 'today')?.items.length ?? 0;
  const lateN = groups.find((g) => g.id === 'overdue')?.items.length ?? 0;
  const nudge = backupNudge(db);

  return (
    <main className="screen">
      <header className="head">
        <div>
          <h1>Minggu ini</h1>
          <p className="muted">
            {greeting(now)}. {longDay(now)}.{' '}
            {open.length === 0 ? 'Belum ada tugas.' : <><b>{todayN}</b> tugas hari ini{lateN ? <>, <b className="danger">{lateN}</b> terlambat</> : ''}.</>}
          </p>
        </div>
        <button className="btn soft" onClick={() => setPasteOpen(true)}><Icon name="paste" size={18} /> Tempel dari WA</button>
      </header>

      <QuickAdd />

      {nudge && (
        <div className="callout">
          <span>Datamu hanya ada di HP ini. Simpan cadangan supaya aman.</span>
          <button className="btn soft" onClick={() => setTab('settings')}>Cadangkan</button>
        </div>
      )}

      {subjects.length > 1 && (
        <div className="chips" role="group" aria-label="Saring mata pelajaran">
          {subjects.map(([s, n]) => (
            <button key={s} className={'chip' + (sameSubject(s, filter) ? ' on' : '')} aria-pressed={sameSubject(s, filter)} onClick={() => setFilter(sameSubject(s, filter) ? null : s)}>{s} <b>{n}</b></button>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="empty">
          <div className="empty-ico"><Icon name="check" size={34} strokeWidth={2.4} /></div>
          <h2>{filter ? 'Tidak ada tugas untuk mapel ini' : 'Tidak ada tugas. Aman!'}</h2>
          <p className="muted">Ketik tugas di atas, atau tempel pesan dari grup kelas supaya Noted mengambil tenggatnya.</p>
        </div>
      ) : (
        groups.map((g) => {
          const items = g.id === 'nodate' && !allNoDate ? g.items.slice(0, NODATE_LIMIT) : g.items;
          return (
            <section key={g.id} className="group">
              <h3 className={g.id === 'overdue' ? 'danger' : ''}>{g.label} <i>{g.items.length}</i></h3>
              <ul className="tasks">{items.map((t) => <TaskRow key={t.id} t={t} now={now} late={g.id === 'overdue'} />)}</ul>
              {g.id === 'nodate' && g.items.length > NODATE_LIMIT && (
                <button className="link" onClick={() => setAllNoDate((v) => !v)}>{allNoDate ? 'Sembunyikan' : `Lihat ${g.items.length - NODATE_LIMIT} lagi`}</button>
              )}
            </section>
          );
        })
      )}
    </main>
  );
}
