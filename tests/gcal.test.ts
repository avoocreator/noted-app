import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDB, migrate, type GCalEvent } from '../src/lib/model.ts';

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
