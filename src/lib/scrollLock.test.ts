import test from 'node:test';
import assert from 'node:assert/strict';
import { lockScroll, unlockScroll, scrollLockCount } from './scrollLock';

/**
 * Dialogs used to set `document.body.style.overflow` directly. Two dialogs open
 * at once (a folder manager under an upload dialog, a delete prompt over the
 * library) meant the first one to close unlocked the page while the other was
 * still covering it. The lock is a counter so the last dialog out restores
 * whatever was there before.
 */

function installDocument(initial = '') {
  const body = { style: { overflow: initial } };
  (globalThis as any).document = { body };
  return body;
}

function drain() {
  while (scrollLockCount() > 0) unlockScroll();
}

test('one dialog locks and restores the page', () => {
  const body = installDocument('auto');
  drain();
  lockScroll();
  assert.equal(body.style.overflow, 'hidden');
  unlockScroll();
  assert.equal(body.style.overflow, 'auto');
});

test('a second dialog keeps the page locked when the first closes', () => {
  const body = installDocument('');
  drain();
  lockScroll();
  lockScroll();
  unlockScroll();
  assert.equal(body.style.overflow, 'hidden');
  unlockScroll();
  assert.equal(body.style.overflow, '');
});

test('unlocking without a lock changes nothing and never throws', () => {
  const body = installDocument('scroll');
  drain();
  assert.doesNotThrow(() => unlockScroll());
  assert.equal(body.style.overflow, 'scroll');
});

test('the lock cannot go negative', () => {
  installDocument('');
  drain();
  unlockScroll();
  unlockScroll();
  assert.equal(scrollLockCount(), 0);
  lockScroll();
  assert.equal(scrollLockCount(), 1);
  drain();
});

test('a missing document is not an error', () => {
  (globalThis as any).document = undefined;
  assert.doesNotThrow(() => lockScroll());
  assert.doesNotThrow(() => unlockScroll());
});
