import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseWaPaste, type Pasted } from '../lib/wa.ts';
import { knownSubjects } from '../lib/schedule.ts';
import type { Task, TaskKind } from '../lib/model.ts';
import { subjectCounts } from '../lib/week.ts';
import { useStore } from '../data/store.ts';
import { Sheet } from '../ui/Sheet.tsx';

type Row = Pasted & { on: boolean };

/** Tempel pesan grup kelas → Noted mengambil tenggat dan mapel → periksa → tambah. */
export function PasteSheet() {
  const db = useStore((s) => s.db);
  const addTasks = useStore((s) => s.addTasks);
  const toast = useStore((s) => s.toast);
  const incomingText = useStore((s) => s.incomingText);
  const close = () => {
    useStore.getState().setIncomingText(null);
    useStore.getState().setPasteOpen(false);
  };

  const [text, setText] = useState(incomingText ?? '');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fromWhatsApp, setFromWhatsApp] = useState(Boolean(incomingText));
  const known = useMemo(() => [...knownSubjects(db.schedule), ...subjectCounts(db.tasks).map(([s]) => s)], [db.schedule, db.tasks]);
  const lastIncomingRef = useRef<string | null>(null);

  const findDuplicate = useCallback((title: string): Task | undefined => {
    const norm = title.trim().toLowerCase();
    if (!norm) return undefined;
    return db.tasks.find((t) => t.title.trim().toLowerCase() === norm);
  }, [db.tasks]);

  const parseAndSetRows = useCallback((raw: string) => {
    const parsed = parseWaPaste(raw, { schedule: db.schedule, subjects: known });
    if (!parsed.length) return false;
    setRows(
      parsed.map((p) => {
        const isDup = Boolean(findDuplicate(p.title));
        return { ...p, on: p.likely && !isDup };
      })
    );
    return true;
  }, [db.schedule, known, findDuplicate]);

  // Otomatis jalankan parsing bila ada teks masuk dari WhatsApp/intent
  useEffect(() => {
    if (incomingText && incomingText.trim() && lastIncomingRef.current !== incomingText) {
      lastIncomingRef.current = incomingText;
      setText(incomingText);
      setFromWhatsApp(true);
      parseAndSetRows(incomingText);
    }
  }, [incomingText, parseAndSetRows]);

  const check = () => {
    if (!parseAndSetRows(text)) {
      toast('Tidak ada teks yang bisa dibaca');
    }
  };

  const patch = (i: number, p: Partial<Row>) => setRows((r) => (r ? r.map((x, j) => (j === i ? { ...x, ...p } : x)) : r));
  const chosen = rows?.filter((r) => r.on && r.title.trim()) ?? [];
  const add = () => {
    const n = addTasks(chosen.map((r) => ({ title: r.title.trim(), due: r.due, time: r.time, subject: r.subject, kind: r.kind, priority: r.priority, recur: r.recur })));
    if (n) { toast(`${n} tugas ditambahkan`); close(); }
  };

  const duplicateCount = useMemo(() => {
    if (!rows) return 0;
    return rows.filter((r) => Boolean(findDuplicate(r.title))).length;
  }, [rows, findDuplicate]);

  return (
    <Sheet title="Tempel dari WhatsApp" onClose={close} full>
      {fromWhatsApp && (
        <div className="row" style={{ marginBottom: 4 }}>
          <span className="tag green">Diterima dari WhatsApp</span>
        </div>
      )}
      {!rows ? (
        <>
          <p className="muted">Salin pesan dari grup kelas, lalu tempel di sini. Noted mencari tenggat dan mata pelajarannya, dan kamu bisa memeriksanya dulu.</p>
          <textarea className="paste-area" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Contoh:\nPR Matematika hal 45 dikumpul Jumat\nBesok bawa alat praktikum IPA\nUlangan Sejarah 24/11'} aria-label="Teks tempelan" />
          <button className="btn primary wide" disabled={!text.trim()} onClick={check}>Periksa</button>
        </>
      ) : (
        <>
          <p className="muted">{rows.length} baris terbaca. Yang berbau tugas sudah dicentang. Ubah teks, tanggal, atau mapel bila perlu.</p>
          {duplicateCount > 0 && (
            <div className="warn">
              Ada {duplicateCount} tugas yang sudah ada di daftar tugas. Periksa kembali sebelum menambahkan.
            </div>
          )}
          <ul className="paste-rows">
            {rows.map((r, i) => {
              const existing = findDuplicate(r.title);
              return (
                <li key={i} className={r.on ? 'on' : ''}>
                  <label className="paste-pick"><input type="checkbox" checked={r.on} onChange={(e) => patch(i, { on: e.target.checked })} /><span className="sr">Ambil baris {i + 1}</span></label>
                  <div className="paste-fields">
                    <input value={r.title} onChange={(e) => patch(i, { title: e.target.value })} aria-label="Teks tugas" />
                    {existing && (
                      <div className="row small danger" style={{ marginTop: -2 }}>
                        <span className="tag warn">Duplikat</span>
                        <span>{existing.done ? 'Tugas serupa sudah ada di riwayat selesai' : 'Tugas serupa sudah ada di daftar tugas'}</span>
                      </div>
                    )}
                    <div className="paste-sub">
                      <input type="date" value={r.due ?? ''} onChange={(e) => patch(i, { due: e.target.value || undefined })} aria-label="Tenggat" />
                      <input value={r.subject ?? ''} placeholder="mapel" onChange={(e) => patch(i, { subject: e.target.value || undefined })} aria-label="Mata pelajaran" />
                      <select value={r.kind} onChange={(e) => patch(i, { kind: e.target.value as TaskKind })} aria-label="Jenis">
                        <option value="tugas">Tugas</option><option value="kumpul">Kumpul</option><option value="bawa">Bawa</option>
                      </select>
                    </div>
                  </div>
                </li>
              );
            })}
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
