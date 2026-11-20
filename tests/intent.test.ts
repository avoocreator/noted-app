import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPendingSharedText, listenSharedText, initIntentListener } from '../src/data/intent.ts';

test('intent: fallback aman di lingkungan non-native', async () => {
  const pending = await getPendingSharedText();
  assert.equal(pending, null);

  let called = false;
  const unsubscribe = await listenSharedText((text) => {
    called = true;
  });
  assert.equal(typeof unsubscribe, 'function');
  assert.doesNotThrow(() => unsubscribe());
  assert.equal(called, false);

  const cleanup = await initIntentListener(() => {});
  assert.equal(typeof cleanup, 'function');
  await assert.doesNotReject(async () => { await cleanup(); });
});
