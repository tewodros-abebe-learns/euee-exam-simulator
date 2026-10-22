import test from 'node:test';
import assert from 'node:assert/strict';
import { safeGetItem, safeSetItem, safeRemoveItem, safeGetJson, safeSetJson } from './safeStorage';

/**
 * `localStorage` is not always available — Safari private mode, sandboxed
 * iframes and storage-blocked browsers throw even on *read*. Before these
 * helpers existed, reading it inside a `useState` initialiser turned "storage
 * is disabled" into the global application-error screen. The contract here is
 * that nothing ever throws and the app simply stops remembering.
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

function installStorage(storage: unknown) {
  (globalThis as any).window = globalThis;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      if (storage instanceof Error) throw storage;
      return storage;
    },
  });
}

test('a blocked storage device never throws and never remembers', () => {
  installStorage(new Error('SecurityError: storage is disabled'));

  assert.equal(safeGetItem('anything'), null);
  assert.equal(safeSetItem('anything', 'value'), false);
  assert.doesNotThrow(() => safeRemoveItem('anything'));
  assert.deepEqual(safeGetJson('anything', { ok: true }), { ok: true });
  assert.equal(safeSetJson('anything', { ok: true }), false);
});

test('a missing storage device is handled the same way', () => {
  (globalThis as any).window = globalThis;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => null });

  assert.equal(safeGetItem('anything'), null);
  assert.equal(safeSetItem('anything', 'value'), false);
  assert.deepEqual(safeGetJson('anything', []), []);
});

test('values round-trip, and corrupt JSON falls back instead of throwing', () => {
  installStorage(new MemoryStorage());

  assert.equal(safeSetItem('theme', 'dark'), true);
  assert.equal(safeGetItem('theme'), 'dark');
  safeRemoveItem('theme');
  assert.equal(safeGetItem('theme'), null);

  assert.equal(safeSetJson('prefs', { language: 'am' }), true);
  assert.deepEqual(safeGetJson('prefs', {}), { language: 'am' });

  safeSetItem('broken', '{not json');
  assert.deepEqual(safeGetJson('broken', { fallback: true }), { fallback: true });
  // A literal "null" must fall back too, not hand back null as the value.
  safeSetItem('nullish', 'null');
  assert.deepEqual(safeGetJson('nullish', { fallback: true }), { fallback: true });
});
