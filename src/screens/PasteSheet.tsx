import { useMemo, useState } from 'react';
import { parseWaPaste, type Pasted } from '../lib/wa.ts';
import { knownSubjects } from '../lib/schedule.ts';
import type { TaskKind } from '../lib/model.ts';
import { subjectCounts } from '../lib/week.ts';
import { useStore } from '../data/store.ts';
import { Sheet } from '../ui/Sheet.tsx';

type Row = Pasted & { on: boolean };

/** Tempel pesan grup kelas → Noted mengambil tenggat dan mapel → periksa → tambah. */
export function PasteSheet() {
  const db = useStore((s) => s.db);
  const addTasks = useStore((s) => s.addTasks);
  const toast = useStore((s) => s.toast);
  const close = () => useStore.getState().setPasteOpen(false);
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const known = useMemo(() => [...knownSubjects(db.schedule), ...subjectCounts(db.tasks).map(([s]) => s)], [db.schedule, db.tasks]);

  const check = () => {
    const parsed = parseWaPaste(text, { schedule: db.schedule, subjects: known });
    if (!parsed.length) { toast('Tidak ada teks yang bisa dibaca'); return; }
    setRows(parsed.map((p) => ({ ...p, on: p.likely })));
  };
  const patch = (i: number, p: Partial<Row>) => setRows((r) => (r ? r.map((x, j) => (j === i ? { ...x, ...p } : x)) : r));
  const chosen = rows?.filter((r) => r.on && r.title.trim()) ?? [];
  const add = () => {
    const n = addTasks(chosen.map((r) => ({ title: r.title.trim(), due: r.due, time: r.time, subject: r.subject, kind: r.kind, priority: r.priority, recur: r.recur })));
    if (n) { toast(`${n} tugas ditambahkan`); close(); }
  };

  return (
    <Sheet title="Tempel dari WhatsApp" onClose={close} full>
      {!rows ? (
        <>
          <p className="muted">Salin pesan dari grup kelas, lalu tempel di sini. Noted mencari tenggat dan mata pelajarannya, dan kamu bisa memeriksanya dulu.</p>
          <textarea className="paste-area" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Contoh:\nPR Matematika hal 45 dikumpul Jumat\nBesok bawa alat praktikum IPA\nUlangan Sejarah 24/11'} aria-label="Teks tempelan" />
          <button className="btn primary wide" disabled={!text.trim()} onClick={check}>Periksa</button>
        </>
      ) : (
        <>
          <p className="muted">{rows.length} baris terbaca. Yang berbau tugas sudah dicentang. Ubah teks, tanggal, atau mapel bila perlu.</p>
          <ul className="paste-rows">
            {rows.map((r, i) => (
              <li key={i} className={r.on ? 'on' : ''}>
                <label className="paste-pick"><input type="checkbox" checked={r.on} onChange={(e) => patch(i, { on: e.target.checked })} /><span className="sr">Ambil baris {i + 1}</span></label>
                <div className="paste-fields">
                  <input value={r.title} onChange={(e) => patch(i, { title: e.target.value })} aria-label="Teks tugas" />
                  <div className="paste-sub">
                    <input type="date" value={r.due ?? ''} onChange={(e) => patch(i, { due: e.target.value || undefined })} aria-label="Tenggat" />
                    <input value={r.subject ?? ''} placeholder="mapel" onChange={(e) => patch(i, { subject: e.target.value || undefined })} aria-label="Mata pelajaran" />
                    <select value={r.kind} onChange={(e) => patch(i, { kind: e.target.value as TaskKind })} aria-label="Jenis">
                      <option value="tugas">Tugas</option><option value="kumpul">Kumpul</option><option value="bawa">Bawa</option>
                    </select>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="row between">
            <button className="btn soft" onClick={() => setRows(null)}>Kembali</button>
            <button className="btn primary" disabled={chosen.length === 0} onClick={add}>Tambah {chosen.length} tugas</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
