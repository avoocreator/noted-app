import { useEffect, useRef, useState } from 'react';
import { exportBackup, parseBackup } from '../lib/backup.ts';
import type { Accent, ThemeMode } from '../lib/model.ts';
import { checkPermission, exactAlarmAllowed, isNative, openExactAlarmSettings, requestPermission, sendTest, type Perm } from '../data/notify.ts';
import { saveBackupFile } from '../data/share.ts';
import { useStore } from '../data/store.ts';
import { Switch } from '../ui/Switch.tsx';

const ACCENTS: [Accent, string][] = [['pink', '#F4B8D9'], ['indigo', '#B5C8EE'], ['green', '#A9BD77'], ['orange', '#F3D55B']];

export function Settings() {
  const db = useStore((s) => s.db);
  const set = useStore((s) => s.setSettings);
  const toast = useStore((s) => s.toast);
  const replaceDB = useStore((s) => s.replaceDB);
  const setScheduleOpen = useStore((s) => s.setScheduleOpen);
  const st = db.settings;
  const [perm, setPerm] = useState<Perm>('prompt');
  const [exact, setExact] = useState(true);
  const file = useRef<HTMLInputElement>(null);

  const refresh = () => { void checkPermission().then(setPerm); void exactAlarmAllowed().then(setExact); };
  useEffect(() => {
    refresh();
    const f = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, []);

  const toggleReminders = async (on: boolean) => {
    set({ remindersOn: on });
    if (on && perm !== 'granted') setPerm(await requestPermission());
  };
  const backup = async () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const ok = await saveBackupFile(exportBackup(db), `noted-cadangan-${stamp}.json`);
    if (ok) { set({ lastBackup: new Date().toISOString() }); toast('Cadangan dibuat'); }
  };
  const restore = async (f: File | undefined) => {
    if (!f) return;
    const r = parseBackup(await f.text());
    if (!r.ok) { toast(r.error); return; }
    if (!window.confirm(`Pulihkan ${r.db.tasks.length} tugas dan ${r.db.notes.length} catatan? Data di HP ini akan diganti.`)) return;
    replaceDB(r.db); toast('Data dipulihkan');
  };
  const test = async () => toast((await sendTest()) ? 'Notifikasi percobaan datang 5 detik lagi' : isNative() ? 'Izin notifikasi belum diberikan' : 'Tes notifikasi hanya di aplikasi Android');

  const time = (label: string, value: string, key: 'defaultTime' | 'dayBeforeTime' | 'bagTime', disabled?: boolean) => (
    <label className="setting-row"><span>{label}</span><input type="time" value={value} disabled={disabled} onChange={(e) => set({ [key]: e.target.value })} /></label>
  );

  return (
    <main className="screen">
      <header className="head"><h1>Pengaturan</h1></header>

      <section className="card">
        <h3>Pengingat</h3>
        <div className="setting-row"><span>Ingatkan tugas</span><Switch on={st.remindersOn} onChange={(v) => void toggleReminders(v)} label="Ingatkan tugas" /></div>
        {st.remindersOn && perm === 'denied' && <p className="warn">Izin notifikasi ditolak. Aktifkan di Pengaturan HP → Aplikasi → Noted → Notifikasi.</p>}
        {st.remindersOn && perm === 'prompt' && <button className="btn soft" onClick={() => void requestPermission().then(setPerm)}>Izinkan notifikasi</button>}
        {st.remindersOn && !exact && <div className="warn">Android membatasi alarm tepat waktu. <button className="link" onClick={() => void openExactAlarmSettings()}>Izinkan alarm</button></div>}
        {time('Jam pengingat tugas bertanggal', st.defaultTime, 'defaultTime', !st.remindersOn)}
        <div className="setting-row"><span>Ingatkan juga sehari sebelumnya</span><Switch on={st.dayBefore} onChange={(v) => set({ dayBefore: v })} label="Pengingat sehari sebelumnya" disabled={!st.remindersOn} /></div>
        {st.dayBefore && time('Jam pengingat H-1', st.dayBeforeTime, 'dayBeforeTime', !st.remindersOn)}
        <div className="setting-row"><span>Notifikasi Tas Besok</span><Switch on={st.bagOn} onChange={(v) => set({ bagOn: v })} label="Notifikasi Tas Besok" disabled={!st.remindersOn} /></div>
        {st.bagOn && time('Jam Tas Besok', st.bagTime, 'bagTime', !st.remindersOn)}
        <button className="btn soft" onClick={() => void test()}>Kirim notifikasi percobaan</button>
        <p className="muted small">Di beberapa HP (Xiaomi, Oppo, Vivo) pengingat bisa tertunda bila penghemat baterai aktif. Setel Noted ke "Tanpa batasan" di pengaturan baterai.</p>
      </section>

      <section className="card">
        <h3>Jadwal pelajaran</h3>
        <button className="btn soft" onClick={() => setScheduleOpen(true)}>Atur jadwal</button>
      </section>

      <section className="card">
        <h3>Tampilan</h3>
        <div className="setting-row"><span>Tema</span>
          <div className="seg compact" role="radiogroup" aria-label="Tema">
            {([['auto', 'Otomatis'], ['light', 'Terang'], ['dark', 'Gelap']] as [ThemeMode, string][]).map(([k, l]) => <button key={k} role="radio" aria-checked={st.theme === k} className={st.theme === k ? 'on' : ''} onClick={() => set({ theme: k })}>{l}</button>)}
          </div>
        </div>
        <div className="setting-row"><span>Warna</span>
          <div className="swatches" role="radiogroup" aria-label="Warna">
            {ACCENTS.map(([k, c]) => <button key={k} role="radio" aria-checked={st.accent === k} aria-label={k} className={st.accent === k ? 'on' : ''} style={{ background: c }} onClick={() => set({ accent: k })} />)}
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Cadangan</h3>
        <p className="muted">Datamu tersimpan di HP ini saja. Kalau aplikasi dihapus, data ikut hilang, jadi simpan cadangan berkala.</p>
        <div className="row wrap gap">
          <button className="btn primary" onClick={() => void backup()}>Buat cadangan</button>
          <button className="btn soft" onClick={() => file.current?.click()}>Pulihkan dari berkas</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { void restore(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <p className="muted small">{st.lastBackup ? `Cadangan terakhir: ${new Date(st.lastBackup).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Belum pernah dicadangkan.'}</p>
      </section>

      <p className="muted small center">Noted 0.1.0 · semua data tersimpan di HP ini, tanpa akun.</p>
    </main>
  );
}
