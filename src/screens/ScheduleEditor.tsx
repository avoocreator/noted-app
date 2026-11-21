import { useState } from 'react';
import { DAYS_ID } from '../lib/dates.ts';
import { classMessage, decodeSchedule, encodeSchedule } from '../lib/classcode.ts';
import { copyDay, hasSchedule, knownSubjects, SCHOOL_DAYS, setDay } from '../lib/schedule.ts';
import { COMMON_SUBJECTS, displaySubject, sameSubject } from '../lib/subjects.ts';
import { shareText } from '../data/share.ts';
import { useStore } from '../data/store.ts';
import { Icon } from '../ui/Icon.tsx';
import { Sheet } from '../ui/Sheet.tsx';
import { QrModal } from '../ui/QrModal.tsx';

/** Isi jadwal pelajaran per hari. Tanpa jam: yang dibutuhkan hanya hari dan daftar mapel. */
export function ScheduleEditor() {
  const schedule = useStore((s) => s.db.schedule);
  const setSchedule = useStore((s) => s.setSchedule);
  const toast = useStore((s) => s.toast);
  const close = () => useStore.getState().setScheduleOpen(false);
  const initial = SCHOOL_DAYS.includes(new Date().getDay() === 0 ? 1 : new Date().getDay()) ? (new Date().getDay() === 0 ? 1 : new Date().getDay()) : 1;
  const [day, setDay_] = useState(initial);
  const [text, setText] = useState('');
  const [code, setCode] = useState('');
  const [showQr, setShowQr] = useState(false);

  const list = schedule[day] ?? [];
  const put = (l: string[]) => setSchedule(setDay(schedule, day, l));
  const add = (raw: string) => {
    const name = displaySubject(raw.trim());
    if (name) put([...list, name]);
    setText('');
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const l = [...list];
    [l[i], l[j]] = [l[j], l[i]];
    put(l);
  };
  const suggestions = [...knownSubjects(schedule), ...COMMON_SUBJECTS.filter((c) => !knownSubjects(schedule).some((k) => sameSubject(k, c)))]
    .filter((c) => !list.some((x) => x.toLowerCase() === c.toLowerCase()))
    .slice(0, 12);

  const share = async () => {
    if (!hasSchedule(schedule)) { toast('Isi jadwal dulu'); return; }
    const r = await shareText(classMessage(schedule), 'Jadwal kelas');
    if (r === 'copied') toast('Kode jadwal disalin. Tempel di grup kelas.');
  };
  const importCode = () => {
    const s = decodeSchedule(code);
    if (!s) { toast('Kode tidak dikenali'); return; }
    if (hasSchedule(schedule) && !window.confirm('Ganti jadwalmu dengan jadwal dari kode ini?')) return;
    setSchedule(s); setCode('');
    toast('Jadwal diimpor');
  };

  return (
    <Sheet title="Jadwal pelajaran" onClose={close} full>
      <div className="daytabs" role="tablist">
        {SCHOOL_DAYS.map((d) => (
          <button key={d} role="tab" aria-selected={day === d} className={day === d ? 'on' : ''} onClick={() => setDay_(d)}>
            {DAYS_ID[d].slice(0, 3)}{(schedule[d]?.length ?? 0) > 0 && <i>{schedule[d].length}</i>}
          </button>
        ))}
      </div>
      <h3 className="sub">{DAYS_ID[day]}</h3>

      {list.length === 0 ? <p className="muted">Belum ada mapel. Ketuk mapel di bawah sesuai urutan jam pelajaran.</p> : (
        <ol className="sched">
          {list.map((s, i) => (
            <li key={i + s}>
              <span className="n">{i + 1}</span><span className="grow">{s}</span>
              <button className="icon-btn" aria-label={`Naikkan ${s}`} onClick={() => move(i, -1)} disabled={i === 0}><Icon name="up" size={18} /></button>
              <button className="icon-btn" aria-label={`Turunkan ${s}`} onClick={() => move(i, 1)} disabled={i === list.length - 1}><Icon name="down" size={18} /></button>
              <button className="icon-btn" aria-label={`Hapus ${s}`} onClick={() => put(list.filter((_, j) => j !== i))}><Icon name="x" size={18} /></button>
            </li>
          ))}
        </ol>
      )}

      <div className="chips" role="group" aria-label="Tambah mapel">
        {suggestions.map((c) => <button key={c} className="chip" onClick={() => add(c)}>+ {c}</button>)}
      </div>
      <form className="quick" onSubmit={(e) => { e.preventDefault(); add(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mapel lain (boleh singkatan, mis. KIM)" aria-label="Mapel lain" />
        <button className="btn primary" type="submit" disabled={!text.trim()}>Tambah</button>
      </form>

      <div className="row wrap gap">
        <label className="inline">Salin dari
          <select value="" onChange={(e) => { if (e.target.value !== '') setSchedule(copyDay(schedule, Number(e.target.value), day)); }} aria-label="Salin dari hari lain">
            <option value="">pilih hari…</option>
            {SCHOOL_DAYS.filter((d) => d !== day && (schedule[d]?.length ?? 0) > 0).map((d) => <option key={d} value={d}>{DAYS_ID[d]}</option>)}
          </select>
        </label>
        {list.length > 0 && <button className="btn soft" onClick={() => put([])}>Kosongkan hari</button>}
      </div>

      <hr />
      <h3 className="sub">Bagikan ke teman sekelas</h3>
      <p className="muted">Satu orang cukup mengisi. Yang lain menempel kodenya di bawah atau memindai QR langsung.</p>
      <div className="row wrap gap">
        <button className="btn soft" onClick={() => void share()}><Icon name="share" size={18} /> Bagikan teks</button>
        <button className="btn soft" onClick={() => {
          if (!hasSchedule(schedule)) { toast('Isi jadwal dulu'); return; }
          setShowQr(true);
        }}><Icon name="qr" size={18} /> Tampilkan QR</button>
      </div>

      <h3 className="sub">Impor dari kode kelas</h3>
      <textarea className="paste-area" rows={3} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Tempel pesan atau kode NOTED1-… dari temanmu" aria-label="Kode kelas" />
      <button className="btn soft" disabled={!code.trim()} onClick={importCode}>Impor jadwal</button>
      {showQr && <QrModal title="QR Jadwal Kelas" code={encodeSchedule(schedule)} onClose={() => setShowQr(false)} />}
    </Sheet>
  );
}
