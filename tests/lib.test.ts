import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, dayDiff, dueLabel, nextWeekday, parseYmd, ymd } from '../src/lib/dates.ts';
import { parseTask } from '../src/lib/parse.ts';
import { parseWaPaste, stripWaPrefix } from '../src/lib/wa.ts';
import { canonicalSubject, findSubjectInText, sameSubject, subjectKey } from '../src/lib/subjects.ts';
import { copyDay, knownSubjects, nextMeeting, setDay, subjectsOn } from '../src/lib/schedule.ts';
import { emptySchedule, createDB, migrate, type Schedule, type Task } from '../src/lib/model.ts';
import { makeTask, toggleDone } from '../src/lib/tasks.ts';
import { groupTasks, subjectCounts } from '../src/lib/week.ts';

// Rabu, 18 November 2026, 10:00
const NOW = new Date(2026, 10, 18, 10, 0, 0);

const sched = (): Schedule => {
  let s = emptySchedule();
  s = setDay(s, 3, ['MTK TL', 'MTK', 'BIG', 'KIM']); // Rabu
  s = setDay(s, 4, ['SB', 'PJOK', 'MTK', 'BIN']); // Kamis
  s = setDay(s, 5, ['Bimbingan TKA']); // Jumat
  return s;
};

test('dates: parse, hari, bulan, label', () => {
  assert.equal(parseYmd('2026-02-30'), null);
  assert.equal(ymd(parseYmd('2026-11-18')!), '2026-11-18');
  assert.equal(ymd(nextWeekday(NOW, 3)), '2026-11-25'); // Rabu → Rabu depan (selalu SETELAH)
  assert.equal(ymd(addMonths(new Date(2026, 0, 31), 1)), '2026-02-28');
  assert.equal(dayDiff(new Date(2026, 10, 20), NOW), 2);
  assert.equal(dueLabel('2026-11-18', NOW), 'Hari ini');
  assert.equal(dueLabel('2026-11-19', NOW), 'Besok');
  assert.equal(dueLabel('2026-11-17', NOW), 'Kemarin');
  assert.equal(dueLabel('2026-11-21', NOW), 'Sabtu');
  assert.equal(dueLabel('2026-12-05', NOW), '5 Des');
});

test('subjects: singkatan jadwal sekolah dan nama panjang dianggap sama', () => {
  assert.equal(subjectKey('MTK'), 'matematika');
  assert.ok(sameSubject('Matematika', 'MTK'));
  assert.ok(sameSubject('MTK TL', 'matematika'));
  assert.ok(sameSubject('BIG', 'B. Inggris'));
  assert.ok(sameSubject('BIN', 'Bahasa Indonesia'));
  assert.ok(!sameSubject('Fisika', 'Kimia'));
  assert.ok(!sameSubject(undefined, 'MTK'));
  assert.equal(canonicalSubject('mtk'), 'Matematika');
  assert.equal(canonicalSubject('MTK TL'), 'MTK TL');
  assert.equal(canonicalSubject('mtk', ['MTK']), 'MTK');
  assert.equal(findSubjectInText('PR fisika hal 3'), 'Fisika');
  assert.equal(findSubjectInText('PR hal 3 BIG', ['BIG']), 'BIG');
  assert.equal(findSubjectInText('makan siang'), undefined);
});

test('parseTask: tenggat, jam, mapel, jenis', () => {
  let p = parseTask('PR Matematika hal 45 dikumpul Jumat', { now: NOW });
  assert.equal(p.due, '2026-11-20'); assert.equal(p.subject, 'Matematika'); assert.equal(p.kind, 'kumpul');
  assert.equal(p.title, 'PR Matematika hal 45');
  p = parseTask('Besok bawa alat praktikum IPA', { now: NOW });
  assert.equal(p.due, '2026-11-19'); assert.equal(p.kind, 'bawa'); assert.equal(p.subject, 'IPA');
  assert.equal(p.title, 'bawa alat praktikum IPA');
  p = parseTask('rapat jumat jam 14.30 !penting', { now: NOW });
  assert.equal(p.time, '14:30'); assert.equal(p.priority, 'high'); assert.equal(p.due, '2026-11-20');
  p = parseTask('belajar jam 7 malam', { now: NOW });
  assert.equal(p.time, '19:00'); assert.equal(p.due, '2026-11-18');
  p = parseTask('piket tiap minggu #kelas', { now: NOW });
  assert.equal(p.recur, 'week'); assert.equal(p.subject, 'kelas');
});

test('parseTask: format tanggal', () => {
  assert.equal(parseTask('Ulangan 24/11', { now: NOW }).due, '2026-11-24');
  assert.equal(parseTask('Ulangan 5/12/2026', { now: NOW }).due, '2026-12-05');
  assert.equal(parseTask('Laporan 3/11', { now: NOW }).due, '2027-11-03');
  assert.equal(parseTask('Presentasi 24 november', { now: NOW }).due, '2026-11-24');
  assert.equal(parseTask('Presentasi tgl 24 nov', { now: NOW }).due, '2026-11-24');
  assert.equal(parseTask('Kumpul lusa', { now: NOW }).due, '2026-11-20');
  assert.equal(parseTask('Kumpul minggu depan', { now: NOW }).due, '2026-11-25');
  assert.equal(parseTask('Kumpul 2026-12-01', { now: NOW }).due, '2026-12-01');
  assert.equal(parseTask('Tugas minggu ini', { now: NOW }).due, undefined); // bukan hari Minggu
  assert.equal(parseTask('Kumpul hari minggu', { now: NOW }).due, '2026-11-22');
});

test('parseTask: "<hari> depan" = hari itu di pekan (Senin–Minggu) berikutnya', () => {
  assert.equal(parseTask('Kumpul jumat depan', { now: NOW }).due, '2026-11-27');
  assert.equal(parseTask('Kumpul senin depan', { now: NOW }).due, '2026-11-23');
  assert.equal(parseTask('Kumpul jumat', { now: NOW }).due, '2026-11-20');
});

test('parseTask: "pertemuan berikutnya" memakai jadwal pelajaran', () => {
  const ctx = { now: NOW, schedule: sched() };
  // hari ini Rabu ada MTK; pertemuan berikutnya = Kamis
  let p = parseTask('PR Matematika dikumpul pertemuan berikutnya', ctx);
  assert.equal(p.meeting, true); assert.equal(p.due, '2026-11-19'); assert.equal(p.subject, 'Matematika');
  assert.equal(p.title, 'PR Matematika');
  // mapel tanpa jadwal → tanpa tanggal, tetapi ditandai
  p = parseTask('PR Sejarah dikumpul pertemuan berikutnya', ctx);
  assert.equal(p.meeting, true); assert.equal(p.due, undefined);
  // mapel jadwal bernama singkatan ("MTK") cocok dengan tulisan panjang
  p = parseTask('Tugas Fisika pertemuan selanjutnya', { now: NOW, schedule: setDay(emptySchedule(), 5, ['FIS']) });
  assert.equal(p.due, '2026-11-20');
});

test('wa: awalan, kebisingan, tugas terpilih otomatis', () => {
  assert.equal(stripWaPrefix('[18/11/26 20.15] Bu Ani: PR Mtk hal 45'), 'PR Mtk hal 45');
  assert.equal(stripWaPrefix('18/11/2026, 20.15 - Bu Ani: PR Mtk hal 45'), 'PR Mtk hal 45');
  assert.equal(stripWaPrefix('20.15 - Bu Ani: PR Mtk hal 45'), 'PR Mtk hal 45');
  assert.equal(stripWaPrefix('1. Bawa alat'), 'Bawa alat');
  const raw = [
    '[18/11/26 20.15] Bu Ani: PR Matematika hal 45 dikumpul Jumat',
    '[18/11/26 20.16] Bu Ani: Besok bawa alat praktikum IPA',
    '[18/11/26 20.17] Budi: oke bu',
    '<Media tidak disertakan>',
    '',
    'Ulangan Sejarah 24/11',
  ].join('\n');
  const r = parseWaPaste(raw, { now: NOW });
  assert.equal(r.length, 4);
  assert.equal(r[0].due, '2026-11-20'); assert.equal(r[0].kind, 'kumpul'); assert.equal(r[0].likely, true);
  assert.equal(r[1].due, '2026-11-19'); assert.equal(r[1].kind, 'bawa');
  assert.equal(r[2].likely, false);
  assert.equal(r[3].due, '2026-11-24'); assert.equal(r[3].subject, 'Sejarah');
});

test('schedule: mapel hari itu, pertemuan berikutnya, salin hari', () => {
  const s = sched();
  assert.deepEqual(subjectsOn(setDay(s, 3, ['MTK', 'mtk', 'BIG']), new Date(2026, 10, 18)), ['MTK', 'BIG']);
  assert.equal(ymd(nextMeeting(s, 'Matematika', NOW)!), '2026-11-19');
  assert.equal(ymd(nextMeeting(s, 'BIG', NOW)!), '2026-11-25'); // Rabu depan
  assert.equal(nextMeeting(s, 'Seni Rupa', NOW), null);
  assert.deepEqual(copyDay(s, 4, 1)[1], ['SB', 'PJOK', 'MTK', 'BIN']);
  assert.deepEqual(knownSubjects(s).slice(0, 3), ['MTK TL', 'MTK', 'BIG']);
});

test('tasks: centang, urungkan, berulang', () => {
  const t = makeTask({ title: 'Piket', due: '2026-11-18', recur: 'week' }, NOW);
  const r = toggleDone(t, NOW);
  assert.equal(r.updated.done, true); assert.ok(r.updated.doneAt);
  assert.equal(r.next?.due, '2026-11-25'); assert.equal(r.next?.done, false); assert.notEqual(r.next?.id, t.id);
  const back = toggleDone(r.updated, NOW);
  assert.equal(back.updated.done, false); assert.equal(back.next, undefined);
  assert.equal(toggleDone(makeTask({ title: 'x' }), NOW).next, undefined);
  // berulang yang tertinggal jauh melompat ke masa depan
  const late = toggleDone(makeTask({ title: 'Harian', due: '2026-11-01', recur: 'day' }, NOW), NOW);
  assert.equal(late.next?.due, '2026-11-18');
});

const mk = (title: string, due: string | undefined, o: Partial<Task> = {}): Task => ({ ...makeTask({ title, due }, NOW), ...o });

test('week: kelompok dan urutan', () => {
  const tasks = [
    mk('lama', '2026-11-10'), mk('hari ini siang', '2026-11-18', { time: '13:00' }), mk('hari ini pagi', '2026-11-18', { time: '08:00' }),
    mk('besok', '2026-11-19'), mk('jumat', '2026-11-20'), mk('bulan depan', '2026-12-20'), mk('tanpa', undefined), mk('selesai', '2026-11-18', { done: true }),
  ];
  const g = groupTasks(tasks, NOW);
  assert.deepEqual(g.map((x) => x.id), ['overdue', 'today', 'tomorrow', 'week', 'later', 'nodate']);
  assert.deepEqual(g[1].items.map((t) => t.title), ['hari ini pagi', 'hari ini siang']);
  const m = groupTasks([mk('a', '2026-11-19', { subject: 'MTK' }), mk('b', '2026-11-19', { subject: 'Fisika' })], NOW, 'Matematika');
  assert.equal(m.length, 1); assert.equal(m[0].items[0].title, 'a');
  assert.deepEqual(subjectCounts([mk('a', undefined, { subject: 'X' }), mk('b', undefined, { subject: 'X' }), mk('c', undefined, { subject: 'Y' })]), [['X', 2], ['Y', 1]]);
});

test('migrate: data rusak/lama menjadi DB valid', () => {
  assert.deepEqual(migrate(null), createDB());
  const db = migrate({ tasks: [{ id: 'a', title: 'ok', due: 'bukan-tanggal', kind: 'aneh' }, { title: 'tanpa id' }, 5], notes: [{ id: 'n' }], schedule: [['MTK'], 'x'], settings: { bagTime: 'xx', theme: 'dark' } });
  assert.equal(db.tasks.length, 1); assert.equal(db.tasks[0].due, undefined); assert.equal(db.tasks[0].kind, 'tugas');
  assert.equal(db.notes.length, 1); assert.equal(db.schedule.length, 7); assert.deepEqual(db.schedule[0], ['MTK']);
  assert.equal(db.settings.bagTime, '19:30'); assert.equal(db.settings.theme, 'dark');
});
