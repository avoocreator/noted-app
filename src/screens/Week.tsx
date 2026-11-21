import { useMemo, useState } from 'react';
import { addDays, DAYS_SHORT_ID, greeting, longDay, ymd } from '../lib/dates.ts';
import { backupNudge } from '../lib/backup.ts';
import { groupTasks, subjectCounts } from '../lib/week.ts';
import { sameSubject } from '../lib/subjects.ts';
import { useStore } from '../data/store.ts';
import { Icon } from '../ui/Icon.tsx';
import { QuickAdd } from '../ui/QuickAdd.tsx';
import { TaskRow } from '../ui/TaskRow.tsx';

const NODATE_LIMIT = 5;

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

  const days = Array.from({ length: 7 }, (_, i) => addDays(now, i));
  const perDay = days.map((d) => open.filter((t) => t.due === ymd(d)).length);
  const maxDay = Math.max(1, ...perDay);
  const tomorrowKey = ymd(addDays(now, 1));
  const tomorrowAll = db.tasks.filter((t) => t.due === tomorrowKey);
  const tomorrowLeft = tomorrowAll.filter((t) => !t.done).length;
  const weekAgo = addDays(now, -7).getTime();
  const doneWeek = db.tasks.filter((t) => t.done && t.doneAt && new Date(t.doneAt).getTime() >= weekAgo).length;

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

      <section className="stats" aria-label="Ringkasan">
        <div className="stat yellow s-cross">
          <h3>Hari ini</h3>
          <p className="big">{todayN}<small> tugas</small></p>
          <p className="cap">{lateN ? `${lateN} terlambat` : 'tidak ada yang terlambat'}</p>
        </div>
        <div className="stat pink s-heart">
          <h3>7 hari ke depan</h3>
          <div className="bars" aria-hidden="true">
            {perDay.map((n, i) => (
              <span key={i} className={i === 0 ? 'today' : ''}><i style={{ height: `${Math.max(8, (n / maxDay) * 100)}%` }} />{DAYS_SHORT_ID[days[i].getDay()].slice(0, 1)}</span>
            ))}
          </div>
          <p className="cap">{perDay.reduce((a, b) => a + b, 0)} tugas bertenggat</p>
        </div>
        <button className="stat green s-tri" onClick={() => setTab('bag')}>
          <h3>Tas Besok</h3>
          <p className="big">{tomorrowAll.length === 0 ? '–' : tomorrowLeft === 0 ? '✓' : tomorrowLeft}<small>{tomorrowAll.length === 0 ? ' kosong' : tomorrowLeft === 0 ? ' siap' : ' belum siap'}</small></p>
          <p className="cap">Ketuk untuk menyiapkan</p>
        </button>
        <div className="stat blue s-star">
          <h3>Selesai</h3>
          <p className="big">{doneWeek}<small> minggu ini</small></p>
          <p className="cap">Pertahankan!</p>
        </div>
      </section>

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
