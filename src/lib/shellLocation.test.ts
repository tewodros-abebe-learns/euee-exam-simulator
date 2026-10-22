import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseShellTab,
  readShellTab,
  saveShellTab,
  clearShellLocation,
  readCrashStreak,
  recordCrash,
  clearCrashStreak,
  resetToSafestEntrance,
} from './shellLocation';
import { ACTIVE_EXAM_STATE_KEY } from './examProgress';

/**
 * The crash screen's "Reload page" used to start the app from scratch, which
 * meant the dashboard, so a student who crashed inside My Exams lost their
 * place. The remembered tab is what fixes that — and it must never be able to
 * send the student somewhere that does not exist.
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
  clear() {
    this.map.clear();
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

test('only the two entrance tabs are restored', () => {
  assert.equal(parseShellTab('MY_EXAM'), 'MY_EXAM');
  assert.equal(parseShellTab('HOME'), 'HOME');
  assert.equal(parseShellTab('EXAM'), 'HOME');
  assert.equal(parseShellTab('SUMMARY'), 'HOME');
  assert.equal(parseShellTab(''), 'HOME');
  assert.equal(parseShellTab(null), 'HOME');
  assert.equal(parseShellTab(undefined), 'HOME');
  assert.equal(parseShellTab({ tab: 'MY_EXAM' }), 'HOME');
});

test('the tab survives a save/read round trip', () => {
  reset();
  assert.equal(readShellTab(), 'HOME');
  saveShellTab('MY_EXAM');
  assert.equal(readShellTab(), 'MY_EXAM');
  saveShellTab('HOME');
  assert.equal(readShellTab(), 'HOME');
});

test('saving a bogus tab stores the safe default', () => {
  reset();
  saveShellTab('EXAM' as never);
  assert.equal(readShellTab(), 'HOME');
});

test('clearing the location goes back to Home', () => {
  reset();
  saveShellTab('MY_EXAM');
  clearShellLocation();
  assert.equal(readShellTab(), 'HOME');
});

test('the crash streak counts up, caps and resets', () => {
  reset();
  assert.equal(readCrashStreak(), 0);
  assert.equal(recordCrash(), 1);
  assert.equal(recordCrash(), 2);
  assert.equal(readCrashStreak(), 2);
  clearCrashStreak();
  assert.equal(readCrashStreak(), 0);
});

test('a corrupt crash streak reads as zero instead of NaN', () => {
  reset();
  (globalThis as any).localStorage.setItem('euee_crash_streak', 'soon');
  assert.equal(readCrashStreak(), 0);
  (globalThis as any).localStorage.setItem('euee_crash_streak', '-4');
  assert.equal(readCrashStreak(), 0);
  (globalThis as any).localStorage.setItem('euee_crash_streak', '7.8');
  assert.equal(readCrashStreak(), 7);
});

test('the safest entrance forgets both the tab and the open exam', () => {
  reset();
  saveShellTab('MY_EXAM');
  (globalThis as any).localStorage.setItem(ACTIVE_EXAM_STATE_KEY, '{"examQuestions":[]}');
  resetToSafestEntrance();
  assert.equal(readShellTab(), 'HOME');
  assert.equal((globalThis as any).localStorage.getItem(ACTIVE_EXAM_STATE_KEY), null);
});

test('blocked storage never throws', () => {
  install(null);
  assert.equal(readShellTab(), 'HOME');
  assert.equal(readCrashStreak(), 0);
  assert.doesNotThrow(() => saveShellTab('MY_EXAM'));
  assert.doesNotThrow(() => recordCrash());
  assert.doesNotThrow(() => resetToSafestEntrance());

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
  assert.equal(readShellTab(), 'HOME');
  assert.doesNotThrow(() => recordCrash());
  assert.doesNotThrow(() => resetToSafestEntrance());
});
