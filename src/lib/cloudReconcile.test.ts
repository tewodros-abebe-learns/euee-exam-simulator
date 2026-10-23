import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readSeenExamIds,
  writeSeenExamIds,
  clearSeenExamIds,
  findRemovedExamIds,
} from './cloudReconcile';

/**
 * A paper deleted on another device used to stay in this device's library
 * forever. The only safe way to tell "deleted elsewhere" from "created here a
 * moment ago" is to remember what the cloud actually returned last time, so
 * these rules are the whole safety net.
 */

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

function install(storage: unknown) {
  (globalThis as any).window = globalThis;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      return storage;
    },
  });
}

function reset() {
  install(new MemoryStorage());
}

test('nothing is remembered before the first snapshot', () => {
  reset();
  assert.deepEqual(readSeenExamIds('uid-a'), []);
});

test('the ids of one snapshot are read back for the same account', () => {
  reset();
  writeSeenExamIds('uid-a', ['e1', 'e2', 'e1']);
  assert.deepEqual(readSeenExamIds('uid-a'), ['e1', 'e2']);
});

test('another account never inherits the record', () => {
  reset();
  writeSeenExamIds('uid-a', ['e1', 'e2']);
  assert.deepEqual(readSeenExamIds('uid-b'), []);
  assert.deepEqual(readSeenExamIds(null), []);
  assert.deepEqual(readSeenExamIds(undefined), []);
});

test('an id list is capped', () => {
  reset();
  const many = Array.from({ length: 900 }, (_, index) => `e${index}`);
  writeSeenExamIds('uid-a', many);
  assert.equal(readSeenExamIds('uid-a').length, 500);
});

test('a removal is only reported when it is provable', () => {
  // Never on a first run: nothing was seen before.
  assert.deepEqual(findRemovedExamIds([], ['e1', 'e2']), []);
  // Never from an empty snapshot: that could be a transient empty read.
  assert.deepEqual(findRemovedExamIds(['e1', 'e2'], []), []);
  // A genuine deletion plus a new paper: only the missing one is reported.
  assert.deepEqual(findRemovedExamIds(['e1', 'e2', 'e3'], ['e1', 'e4']), ['e2', 'e3']);
  // Nothing changed.
  assert.deepEqual(findRemovedExamIds(['e1'], ['e1']), []);
});

test('clearing forgets everything', () => {
  reset();
  writeSeenExamIds('uid-a', ['e1']);
  clearSeenExamIds();
  assert.deepEqual(readSeenExamIds('uid-a'), []);
});

test('corrupt or blocked storage is treated as "nothing remembered"', () => {
  reset();
  (globalThis as any).localStorage.setItem('euee_cloud_seen_exams', '{not json');
  assert.deepEqual(readSeenExamIds('uid-a'), []);
  (globalThis as any).localStorage.setItem('euee_cloud_seen_exams', '{"uid":"uid-a","ids":"nope"}');
  assert.deepEqual(readSeenExamIds('uid-a'), []);

  install({
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('SecurityError');
    },
    removeItem() {
      throw new Error('SecurityError');
    },
  });
  assert.deepEqual(readSeenExamIds('uid-a'), []);
  assert.doesNotThrow(() => writeSeenExamIds('uid-a', ['e1']));
  assert.doesNotThrow(() => clearSeenExamIds());
});
