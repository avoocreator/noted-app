import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bagBody, bagLong, buildBag } from '../src/lib/bag.ts';
import { notifId, planNotifications, planSignature } from '../src/lib/plan.ts';
import { backupNudge, daysSinceBackup, exportBackup, parseBackup } from '../src/lib/backup.ts';
import { classMessage, decodeSchedule, encodeSchedule } from '../src/lib/classcode.ts';
import { continueList, filterNotes, flipCheck, noteHeading, snippet, toggleLinePrefix } from '../src/lib/notes.ts';
import { createDB, emptySchedule, type DB, type Note, type Task } from '../src/lib/model.ts';
import { makeTask } from '../src/lib/tasks.ts';
import { setDay } from '../src/lib/schedule.ts';

const NOW = new Date(2026, 10, 18, 10, 0, 0); // Rabu
const mk = (title: string, o: Partial<Task> = {}): Task => ({ ...makeTask({ title }, NOW), ...o });

const db = (): DB => {
  const d = createDB();
  d.schedule = setDay(setDay(emptySchedule(), 4, ['MTK', 'Fisika']), 3, ['BIG']);
  d.tasks = [
    mk('PR Mtk hal 45', { due: '2026-11-19', kind: 'kumpul' }),
    mk('Alat praktikum', { due: '2026-11-19', kind: 'bawa' }),
    mk('Tugas bebas', { due: '2026-11-19' }),
    mk('Bukan besok', { due: '2026-11-25' }),
  ];
  return d;
};

test('bag: isi, urutan, status siap', () => {
  const b = buildBag(db().tasks, db().schedule, new Date(2026, 10, 19));
  assert.equal(b.dayName, 'Kamis');
  assert.deepEqual(b.subjects, ['MTK', 'Fisika']);
  assert.deepEqual(b.kumpul.map((t) => t.title).sort(), ['PR Mtk hal 45', 'Tugas bebas']);
  assert.deepEqual(b.bawa.map((t) => t.title), ['Alat praktikum']);
  assert.equal(b.ready, false); assert.equal(b.empty, false);
  assert.match(bagBody(b), /MTK, Fisika/); assert.match(bagBody(b), /Bawa: Alat praktikum/);
  assert.match(bagLong(b), /Kumpul:\n• /);
  const all = db().tasks.map((t) => (t.due === '2026-11-19' ? { ...t, done: true } : t));
  const done = buildBag(all, db().schedule, new Date(2026, 10, 19));
  assert.equal(done.ready, true); assert.equal(done.doneCount, 3);
  const none = buildBag([], emptySchedule(), new Date(2026, 10, 21));
  assert.equal(none.empty, true); assert.equal(bagBody(none), 'Tidak ada yang perlu disiapkan.');
});

test('plan: pengingat tugas, H-1, dan Tas Besok', () => {
  const d = db();
  const p = planNotifications(d, NOW);
  const keys = p.map((x) => x.key);
  const t = d.tasks[0];
  assert.ok(keys.includes(`t:${t.id}:2026-11-19:08:00`)); // hari-H pukul 08.00 (jam bawaan)
  assert.ok(keys.includes(`h1:${t.id}:2026-11-19`)); // sehari sebelumnya 18.00
  const h1 = p.find((x) => x.key === `h1:${t.id}:2026-11-19`)!;
  assert.equal(h1.at, new Date(2026, 10, 18, 18, 0).getTime());
  assert.match(h1.title, /^Besok:/);
  const bag = p.find((x) => x.key === 'bag:2026-11-19')!;
  assert.equal(bag.at, new Date(2026, 10, 18, 19, 30).getTime());
  assert.equal(bag.title, 'Tas Besok · Kamis'); assert.equal(bag.channel, 'noted-tas');
  assert.match(bag.largeBody ?? '', /Kumpul:/);
  assert.ok(p.every((x, i) => i === 0 || p[i - 1].at <= x.at)); // terurut
  assert.ok(p.every((x) => x.at > NOW.getTime())); // tidak ada yang sudah lewat
  assert.equal(new Set(p.map((x) => x.id)).size, p.length); // ID unik
});

test('plan: pengaturan mematikan, selesai/tanpa tanggal diabaikan, jam tugas dipakai', () => {
  const d = db();
  d.settings.remindersOn = false;
  assert.deepEqual(planNotifications(d, NOW), []);
  const e = createDB();
  e.tasks = [mk('selesai', { due: '2026-11-19', done: true }), mk('tanpa tanggal'), mk('jam 7', { due: '2026-11-19', time: '07:00' })];
  e.settings.bagOn = false; e.settings.dayBefore = false;
  const p = planNotifications(e, NOW);
  assert.equal(p.length, 1); assert.equal(p[0].at, new Date(2026, 10, 19, 7, 0).getTime());
  e.settings.defaultTime = ''; e.tasks[2].time = undefined;
  assert.equal(planNotifications(e, NOW).length, 0);
});

test('plan: Tas Besok tetap muncul tanpa jadwal bila ada tugas besok; hari kosong dilewati', () => {
  const e = createDB();
  e.tasks = [mk('Laporan', { due: '2026-11-19' })];
  e.settings.dayBefore = false; e.settings.defaultTime = '';
  const p = planNotifications(e, NOW);
  assert.deepEqual(p.map((x) => x.key), ['bag:2026-11-19']);
});

test('plan: ID stabil dan tanda tangan berubah bila isi berubah', () => {
  assert.equal(notifId('abc'), notifId('abc'));
  assert.notEqual(notifId('abc'), notifId('abd'));
  assert.ok(notifId('x') > 0 && notifId('x') < 2_147_483_647);
  const d = db();
  const a = planSignature(planNotifications(d, NOW));
  assert.equal(a, planSignature(planNotifications(d, NOW)));
  d.tasks[0] = { ...d.tasks[0], title: 'PR diubah' };
  assert.notEqual(a, planSignature(planNotifications(d, NOW)));
});

test('backup: ekspor-impor bolak-balik, tolak berkas salah, ingatkan', () => {
  const d = db();
  const r = parseBackup(exportBackup(d, NOW));
  assert.ok(r.ok && r.db.tasks.length === 4 && r.db.schedule[4].length === 2);
  assert.equal(parseBackup('bukan json').ok, false);
  assert.equal(parseBackup('{"app":"lain","data":{}}').ok, false);
  assert.equal(parseBackup('{"app":"noted"}').ok, false);
  assert.equal(daysSinceBackup(undefined, NOW), null);
  assert.equal(daysSinceBackup(new Date(2026, 10, 8).toISOString(), NOW), 10);
  assert.equal(backupNudge(createDB(), NOW), false); // kosong: tidak perlu
  assert.equal(backupNudge(d, NOW), true); // ada isi, belum pernah cadangan
  d.settings.lastBackup = new Date(2026, 10, 10).toISOString();
  assert.equal(backupNudge(d, NOW), false);
});

test('classcode: bolak-balik, aman dari input buruk, bisa dari pesan utuh', () => {
  const s = setDay(setDay(emptySchedule(), 1, ['MTK TL', 'Bimbingan TKA', 'Pembiasaan Adiwiyata']), 5, ['Bahasa Indonésia ✓']);
  const code = encodeSchedule(s);
  assert.match(code, /^NOTED1-[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeSchedule(code), s);
  assert.deepEqual(decodeSchedule(classMessage(s)), s); // di tengah teks
  assert.equal(decodeSchedule('NOTED1-!!!'), null);
  assert.equal(decodeSchedule('halo'), null);
  assert.equal(decodeSchedule('NOTED1-' + btoa('[1,2]')), null);
});

test('notes: judul, ringkasan, saring, daftar', () => {
  const n = (o: Partial<Note>): Note => ({ id: 'x', title: '', body: '', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...o });
  assert.equal(noteHeading(n({ title: ' Bab 1 ' })), 'Bab 1');
  assert.equal(noteHeading(n({ body: '\nbaris pertama\nkedua' })), 'baris pertama');
  assert.equal(noteHeading(n({})), 'Tanpa judul');
  assert.equal(snippet(n({ title: 'A', body: 'isi satu\nisi dua' })), 'isi satu isi dua');
  assert.equal(snippet(n({ body: 'judul\nisi' })), 'isi');
  const list = [n({ id: '1', title: 'Fisika bab 1', subject: 'Fisika', updatedAt: '2026-02-01' }), n({ id: '2', title: 'Sejarah', body: 'perang dunia', subject: 'Sejarah', updatedAt: '2026-03-01' })];
  assert.deepEqual(filterNotes(list, '', null).map((x) => x.id), ['2', '1']);
  assert.deepEqual(filterNotes(list, 'perang', null).map((x) => x.id), ['2']);
  assert.deepEqual(filterNotes(list, '', 'fisika').map((x) => x.id), ['1']);
  assert.equal(continueList('• satu'), '• ');
  assert.equal(continueList('2. dua'), '3. ');
  assert.equal(continueList('☑ selesai'), '☐ ');
  assert.equal(continueList('• '), ''); // baris kosong keluar dari daftar
  assert.equal(continueList('teks biasa'), '');
  assert.equal(toggleLinePrefix('belajar', 'bullet'), '• belajar');
  assert.equal(toggleLinePrefix('• belajar', 'bullet'), 'belajar');
  assert.equal(toggleLinePrefix('• belajar', 'check'), '☐ belajar');
  assert.equal(toggleLinePrefix('belajar', 'number'), '1. belajar');
  assert.equal(flipCheck('☐ a'), '☑ a'); assert.equal(flipCheck('☑ a'), '☐ a'); assert.equal(flipCheck('a'), 'a');
});
