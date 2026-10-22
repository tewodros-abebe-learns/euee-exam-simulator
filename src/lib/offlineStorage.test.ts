import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { offlineStorage } from './offlineStorage';

/**
 * Regression guard for a deadlock that made the app hang on its loading screen:
 * `init()` used to call `getAllExams()`, which awaits `whenReady()`, which
 * awaits `init()` — a circular wait that never settles. Guest mode has no
 * Firestore listener to rescue it, so the dashboard stayed empty forever.
 *
 * The store is a singleton, so the first call below performs the real
 * initialization (including the legacy-record sweep) and later calls reuse it.
 */

// The store reads `window.indexedDB`; give Node the same shape a browser has.
(globalThis as any).window = globalThis;
(globalThis as any).indexedDB = new IDBFactory();

const withTimeout = <T>(promise: Promise<T>, ms = 3000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('timed out — the storage layer deadlocked')), ms)
    ),
  ]);

test('initialization and the first read both settle', async () => {
  await withTimeout(offlineStorage.init());
  const exams = await withTimeout(offlineStorage.getAllExams());
  assert.deepEqual(exams, []);
});

test('an exam round-trips through IndexedDB', async () => {
  await withTimeout(
    offlineStorage.saveExam({
      id: 'exam_1',
      title: 'Physics unit test',
      subject: 'Physics',
      grade: 'General',
      createdAt: Date.now(),
      questions: [
        {
          id: 'q1',
          question: 'Speed of light?',
          options: ['3e8 m/s', '3e6 m/s'],
          correctAnswerIndex: 0,
          explanation: '',
        },
      ],
    })
  );

  const stored = await withTimeout(offlineStorage.getExamById('exam_1'));
  assert.equal(stored?.title, 'Physics unit test');

  const physics = await withTimeout(offlineStorage.getAllExams('Physics'));
  assert.equal(physics.length, 1);
});

test('a legacy "Mathematics" paper is found by the "Math" folder', async () => {
  await withTimeout(
    offlineStorage.saveExam({
      id: 'exam_2',
      title: 'Mathematics paper',
      subject: 'Mathematics',
      grade: 'Grade 12',
      createdAt: Date.now(),
      questions: [],
    })
  );

  const math = await withTimeout(offlineStorage.getAllExams('Math'));
  assert.equal(math.length, 1);
  assert.equal(math[0].id, 'exam_2');
});

test('stats stay available after initialization', async () => {
  const stats = await withTimeout(offlineStorage.getStats());
  assert.equal(stats.cachedExamsCount, 2);
});
