import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPendingSharedText, listenSharedText, initIntentListener } from '../src/data/intent.ts';
import { useStore } from '../src/data/store.ts';
import { parseWaPaste } from '../src/lib/wa.ts';

test('intent: fallback aman di lingkungan non-native', async () => {
  const pending = await getPendingSharedText();
  assert.equal(pending, null);

  let called = false;
  const unsubscribe = await listenSharedText(() => {
    called = true;
  });
  assert.equal(typeof unsubscribe, 'function');
  assert.doesNotThrow(() => unsubscribe());
  assert.equal(called, false);

  const cleanup = await initIntentListener(() => {});
  assert.equal(typeof cleanup, 'function');
  await assert.doesNotReject(async () => { await cleanup(); });
});

test('intent & store: incomingText dan pasteOpen sinkron saat teks dibagikan', () => {
  useStore.setState({ incomingText: 'PR Fisika hal 20 dikumpul Jumat', pasteOpen: true });
  assert.equal(useStore.getState().incomingText, 'PR Fisika hal 20 dikumpul Jumat');
  assert.equal(useStore.getState().pasteOpen, true);

  useStore.getState().setPasteOpen(false);
  assert.equal(useStore.getState().pasteOpen, false);
  assert.equal(useStore.getState().incomingText, null);
});

test('intent & paste: deteksi duplikat tugas dari db.tasks', () => {
  const existing = [
    { id: 't1', title: 'PR Matematika hal 45', kind: 'kumpul' as const, done: false, createdAt: '' },
    { id: 't2', title: 'Ulangan Sejarah', kind: 'tugas' as const, done: true, createdAt: '' },
  ];

  const parsed = parseWaPaste('PR Matematika hal 45 dikumpul Jumat\nBesok bawa jangka');
  assert.equal(parsed.length, 2);

  const isDup0 = existing.some((t) => t.title.trim().toLowerCase() === parsed[0].title.trim().toLowerCase());
  const isDup1 = existing.some((t) => t.title.trim().toLowerCase() === parsed[1].title.trim().toLowerCase());

  assert.equal(isDup0, true);
  assert.equal(isDup1, false);
});
