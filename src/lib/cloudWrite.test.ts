import test from 'node:test';
import assert from 'node:assert/strict';
import { runWithTimeout } from './cloudWrite';

test('a cloud write that completes reports success', async () => {
  const result = await runWithTimeout(async () => undefined, 1000);
  assert.equal(result, true);
});

test('a stalled cloud write times out instead of hanging', async () => {
  const started = Date.now();
  const result = await runWithTimeout(() => new Promise(() => {}), 50);
  assert.equal(result, false);
  assert.ok(Date.now() - started < 1000, 'must not wait for the stalled promise');
});

test('a failing cloud write resolves false and never rejects', async () => {
  const result = await runWithTimeout(async () => {
    throw new Error('permission-denied');
  }, 1000);
  assert.equal(result, false);
});

test('readWithTimeout returns the value, or the fallback instead of hanging', async () => {
  const { readWithTimeout } = await import('./cloudWrite');

  assert.equal(await readWithTimeout(async () => 'value', 'fallback', 1000), 'value');
  // A read that never settles must not hold a dialog open forever.
  assert.equal(
    await readWithTimeout(() => new Promise<string>(() => {}), 'fallback', 60),
    'fallback'
  );
  // A failing read is a fallback too, never an unhandled rejection.
  assert.equal(
    await readWithTimeout(async () => {
      throw new Error('blocked');
    }, 'fallback', 1000),
    'fallback'
  );
});
