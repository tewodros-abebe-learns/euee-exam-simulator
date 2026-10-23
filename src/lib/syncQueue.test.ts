import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRetireQueueItem, type RetireContext } from './syncQueue';

/**
 * The replay queue must empty itself once there is nothing left to send, and
 * must keep an entry that still has work. It used to fail the first half: a
 * session the app had already written directly was never marked as mirrored,
 * so its entry stayed forever and the badge only went up.
 */

function context(sessions: RetireContext['sessions'], syncedNow: string[] = []): RetireContext {
  return { sessions, syncedNow: new Set(syncedNow) };
}

test('an attempt mirrored in this pass is retired', () => {
  const item = { type: 'SAVE_SESSION', payload: { id: 's1' } };
  assert.equal(shouldRetireQueueItem(item, context([{ id: 's1' }], ['s1'])), true);
});

test('an attempt the app already wrote directly is retired', () => {
  const item = { type: 'SAVE_SESSION', payload: { id: 's1' } };
  assert.equal(shouldRetireQueueItem(item, context([{ id: 's1', syncedWithCloud: true }])), true);
});

test('an attempt that still needs sending is kept', () => {
  const item = { type: 'SAVE_SESSION', payload: { id: 's1' } };
  assert.equal(shouldRetireQueueItem(item, context([{ id: 's1', syncedWithCloud: false }])), false);
});

test('an attempt that no longer exists is retired', () => {
  const item = { type: 'SAVE_SESSION', payload: { id: 'gone' } };
  assert.equal(shouldRetireQueueItem(item, context([{ id: 's1' }])), true);
});

test('a payload without an id cannot be replayed, so it goes', () => {
  assert.equal(shouldRetireQueueItem({ type: 'SAVE_SESSION', payload: {} }, context([])), true);
  assert.equal(shouldRetireQueueItem({ type: 'SAVE_SESSION' }, context([])), true);
  assert.equal(shouldRetireQueueItem({ type: 'SAVE_SESSION', payload: { id: 42 } }, context([])), true);
});

test('exam uploads are not handled by this rule', () => {
  const item = { type: 'CREATE_EXAM', payload: { id: 'e1' } };
  assert.equal(shouldRetireQueueItem(item, context([{ id: 'e1' }])), false);
});

test('one attempt cannot retire another', () => {
  const item = { type: 'SAVE_SESSION', payload: { id: 's1' } };
  assert.equal(shouldRetireQueueItem(item, context([{ id: 's2', syncedWithCloud: true }])), true);
  assert.equal(shouldRetireQueueItem(item, context([{ id: 's2' }], ['s2'])), true);
  assert.equal(shouldRetireQueueItem(item, context([{ id: 's1' }, { id: 's2' }], ['s2'])), false);
});
