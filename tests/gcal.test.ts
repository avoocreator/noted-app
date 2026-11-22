import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDB, migrate, type GCalEvent, type Task } from '../src/lib/model.ts';
import { parseGoogleEvent, parseGoogleEvents, gcalTemplateUrl } from '../src/lib/gcalParser.ts';
import { syncGCalEvents, getStoredToken, saveStoredToken, clearStoredToken } from '../src/data/gcal.ts';

test('gcal model: createDB memiliki field gcalEvents dan pengaturan bawaan', () => {
  const db = createDB();
  assert.deepEqual(db.gcalEvents, []);
  assert.equal(db.settings.gcalEnabled, false);
  assert.equal(db.settings.gcalAutoSync, true);
  assert.equal(db.settings.gcalLastSync, undefined);
});

test('gcal model: migrate mengisi gcalEvents kosong jika data lama belum memilikinya', () => {
  const oldData = {
    v: 1,
    rev: 2,
    tasks: [],
    notes: [],
    schedule: [[], [], [], [], [], [], []],
    settings: { remindersOn: true },
  };

  const migrated = migrate(oldData);
  assert.deepEqual(migrated.gcalEvents, []);
  assert.equal(migrated.settings.gcalEnabled, false);
  assert.equal(migrated.settings.gcalAutoSync, true);
});

test('gcal model: migrate memvalidasi dan mempertahankan gcalEvents yang valid', () => {
  const rawData = {
    v: 1,
    rev: 3,
    tasks: [],
    notes: [],
    schedule: [[], [], [], [], [], [], []],
    gcalEvents: [
      {
        id: 'evt-1',
        title: 'Ujian Tengah Semester Fisika',
        date: '2026-11-25',
        time: '08:00',
        endTime: '10:00',
        location: 'Ruang Lab IPA',
        allDay: false,
        htmlLink: 'https://calendar.google.com/event?id=1',
        updatedAt: '2026-11-22T10:00:00Z',
      },
      {
        id: 'evt-corrupt-no-title',
        date: '2026-11-26',
      },
      {
        id: 'evt-2',
        title: 'Libur Nasional',
        date: '2026-11-27',
        allDay: true,
        updatedAt: '2026-11-22T10:00:00Z',
      },
    ],
    settings: {
      gcalEnabled: true,
      gcalAutoSync: false,
      gcalLastSync: '2026-11-22T12:00:00Z',
    },
  };

  const migrated = migrate(rawData);
  assert.equal(migrated.gcalEvents.length, 2);
  assert.equal(migrated.gcalEvents[0].id, 'evt-1');
  assert.equal(migrated.gcalEvents[0].title, 'Ujian Tengah Semester Fisika');
  assert.equal(migrated.gcalEvents[0].time, '08:00');
  assert.equal(migrated.gcalEvents[1].id, 'evt-2');
  assert.equal(migrated.gcalEvents[1].allDay, true);
  assert.equal(migrated.settings.gcalEnabled, true);
  assert.equal(migrated.settings.gcalAutoSync, false);
  assert.equal(migrated.settings.gcalLastSync, '2026-11-22T12:00:00Z');
});

test('gcal parser: mengurai all-day event dan timed event dengan benar', () => {
  const allDayRaw = {
    id: 'g-1',
    summary: 'Hari Guru Nasional',
    start: { date: '2026-11-25' },
    end: { date: '2026-11-26' },
    htmlLink: 'https://calendar.google.com/event?id=g-1',
    updated: '2026-11-22T00:00:00Z',
  };

  const parsedAllDay = parseGoogleEvent(allDayRaw);
  assert.ok(parsedAllDay);
  assert.equal(parsedAllDay.id, 'g-1');
  assert.equal(parsedAllDay.title, 'Hari Guru Nasional');
  assert.equal(parsedAllDay.date, '2026-11-25');
  assert.equal(parsedAllDay.allDay, true);
  assert.equal(parsedAllDay.time, undefined);

  const timedRaw = {
    id: 'g-2',
    summary: 'Bimbingan Konseling',
    location: 'Ruang BK',
    start: { dateTime: '2026-11-26T13:15:00+07:00' },
    end: { dateTime: '2026-11-26T14:00:00+07:00' },
    updated: '2026-11-22T01:00:00Z',
  };

  const parsedTimed = parseGoogleEvent(timedRaw);
  assert.ok(parsedTimed);
  assert.equal(parsedTimed.id, 'g-2');
  assert.equal(parsedTimed.title, 'Bimbingan Konseling');
  assert.equal(parsedTimed.date, '2026-11-26');
  assert.equal(parsedTimed.allDay, false);
  assert.equal(parsedTimed.time, '13:15');
  assert.equal(parsedTimed.endTime, '14:00');
  assert.equal(parsedTimed.location, 'Ruang BK');

  // Cancelled event diabaikan
  assert.equal(parseGoogleEvent({ id: 'g-3', status: 'cancelled' }), null);

  // Tanpa waktu start diabaikan
  assert.equal(parseGoogleEvent({ id: 'g-4', summary: 'Tanpa waktu' }), null);
});

test('gcal parser: parseGoogleEvents menyaring dan mengurutkan secara kronologis', () => {
  const items = [
    { id: '3', summary: 'Sore', start: { dateTime: '2026-11-25T15:00:00+07:00' } },
    { id: '1', summary: 'Pagi', start: { dateTime: '2026-11-25T08:00:00+07:00' } },
    { id: 'cancelled', status: 'cancelled', start: { dateTime: '2026-11-25T09:00:00+07:00' } },
    { id: '2', summary: 'Sepanjang Hari', start: { date: '2026-11-25' } },
    { id: '4', summary: 'Besok', start: { date: '2026-11-26' } },
  ];

  const parsed = parseGoogleEvents(items);
  assert.equal(parsed.length, 4);
  assert.deepEqual(parsed.map((e) => e.id), ['2', '1', '3', '4']);
});

test('gcal parser: gcalTemplateUrl menghasilkan web intent URL yang valid', () => {
  const taskWithTime: Task = {
    id: 't-1',
    title: 'PR Fisika Bab 2 & 3',
    due: '2026-11-28',
    time: '19:30',
    subject: 'Fisika',
    kind: 'kumpul',
    done: false,
    createdAt: '',
  };

  const url1 = gcalTemplateUrl(taskWithTime);
  assert.match(url1, /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
  assert.match(url1, /text=PR\+Fisika\+Bab\+2\+%26\+3/);
  assert.match(url1, /dates=20261128T193000/);

  const taskAllDay: Task = {
    id: 't-2',
    title: 'Bawa Kamus Bahasa',
    due: '2026-11-29',
    kind: 'bawa',
    done: false,
    createdAt: '',
  };

  const url2 = gcalTemplateUrl(taskAllDay);
  assert.match(url2, /dates=20261129%2F20261130/);
});

test('gcal data: penyimpanan token kedaluwarsa dan pembersihan', () => {
  let mockStore: Record<string, string> = {};
  const orig = globalThis.localStorage;
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => mockStore[k] ?? null,
    setItem: (k: string, v: string) => { mockStore[k] = v; },
    removeItem: (k: string) => { delete mockStore[k]; },
    clear: () => { mockStore = {}; },
    length: 0,
    key: () => null,
  };

  try {
    assert.equal(getStoredToken(), null);

    // Simpan token aktif 3600 detik
    saveStoredToken('ya29.test-token-123', 3600);
    assert.equal(getStoredToken(), 'ya29.test-token-123');

    // Hapus token
    clearStoredToken();
    assert.equal(getStoredToken(), null);

    // Token kedaluwarsa (expiresIn <= 0)
    saveStoredToken('ya29.expired-token', -10);
    assert.equal(getStoredToken(), null);
  } finally {
    (globalThis as unknown as { localStorage: unknown }).localStorage = orig;
  }
});

test('gcal data: syncGCalEvents menangani kondisi offline dengan aman', async () => {
  const origNavigator = globalThis.navigator;
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
      writable: true,
    });

    const res = await syncGCalEvents('dummy-token');
    assert.equal(res.success, false);
    assert.equal(res.error, 'offline');
    assert.deepEqual(res.events, []);
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      value: origNavigator,
      configurable: true,
      writable: true,
    });
  }
});
