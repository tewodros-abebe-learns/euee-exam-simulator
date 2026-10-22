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

test('deleting an exam also removes its attempts — in one transaction', async () => {
  await offlineStorage.saveExam({
    id: 'exam_cascade',
    title: 'Cascade test',
    subject: 'Physics',
    grade: 'General',
    questions: [{ id: 'q1', question: 'Q?', options: ['a', 'b'], correctAnswerIndex: 0, explanation: '' }],
    createdBy: 'guest',
    createdAt: Date.now(),
  } as any);
  await offlineStorage.saveSession({
    id: 'session_cascade_1',
    examId: 'exam_cascade',
    userId: 'guest',
    status: 'COMPLETED',
    answers: {},
    startTime: Date.now(),
    timeLimit: 0,
    lastUpdated: Date.now(),
    syncedWithCloud: false,
  });
  await offlineStorage.saveSession({
    id: 'session_cascade_2',
    examId: 'exam_cascade',
    userId: 'guest',
    status: 'IN_PROGRESS',
    answers: {},
    startTime: Date.now(),
    timeLimit: 0,
    lastUpdated: Date.now(),
    syncedWithCloud: false,
  });
  // An unrelated attempt must survive.
  await offlineStorage.saveSession({
    id: 'session_other',
    examId: 'exam_other',
    userId: 'guest',
    status: 'COMPLETED',
    answers: {},
    startTime: Date.now(),
    timeLimit: 0,
    lastUpdated: Date.now(),
    syncedWithCloud: false,
  });

  await withTimeout(offlineStorage.deleteExamCascade('exam_cascade'));

  const exams = await offlineStorage.getAllExams();
  assert.ok(!exams.some((exam) => exam.id === 'exam_cascade'));
  const sessions = await offlineStorage.getAllSessions();
  assert.ok(!sessions.some((session) => session.examId === 'exam_cascade'));
  assert.ok(sessions.some((session) => session.id === 'session_other'));
});

test('pruning keeps the newest attempts and never drops an in-progress one', async () => {
  const now = Date.now();
  // Oldest first so the pruning order is unambiguous.
  for (let index = 0; index < 6; index += 1) {
    await offlineStorage.saveSession({
      id: `prune_${index}`,
      examId: 'exam_prune',
      userId: 'guest',
      status: index === 0 ? 'IN_PROGRESS' : 'COMPLETED',
      answers: {},
      startTime: now,
      timeLimit: 0,
      lastUpdated: now + index * 1000,
      syncedWithCloud: false,
    });
  }

  const before = await offlineStorage.getAllSessions();
  const removed = await offlineStorage.pruneSessions(before.length - 2);
  // Only completed attempts are evictable, and the newest ones must stay.
  assert.ok(removed >= 1);
  const after = await offlineStorage.getAllSessions();
  assert.ok(after.length <= before.length - 1);
  assert.ok(after.some((session) => session.id === 'prune_0'), 'in-progress attempt is never pruned');
  assert.ok(after.some((session) => session.id === 'prune_5'), 'newest attempt is kept');
});

test('the replay queue coalesces repeated saves of the same attempt', async () => {
  const before = (await offlineStorage.getSyncQueue()).length;
  for (let index = 1; index <= 5; index += 1) {
    await offlineStorage.addToSyncQueue({
      type: 'SAVE_SESSION',
      payload: { id: 'queued_session', examId: 'exam_q', answers: { q1: `a${index}` }, userId: 'guest' },
      timestamp: Date.now(),
    });
  }

  const queue = await offlineStorage.getSyncQueue();
  const forThisSession = queue.filter((entry) => (entry.payload as any)?.id === 'queued_session');
  assert.equal(forThisSession.length, 1, 'one entry per attempt, not one per keystroke');
  // The surviving entry must be the newest payload, not the oldest.
  assert.equal((forThisSession[0].payload as any).answers.q1, 'a5');
  assert.equal(queue.length, before + 1);
});

test('the replay queue is capped so it cannot fill the device', async () => {
  for (let index = 0; index < 105; index += 1) {
    await offlineStorage.addToSyncQueue({
      type: 'CREATE_EXAM',
      payload: { id: `queued_exam_${index}` },
      timestamp: Date.now(),
    });
  }
  const queue = await offlineStorage.getSyncQueue();
  assert.ok(queue.length <= 100, `queue grew to ${queue.length}`);
  // Newest work is what survives.
  assert.ok(queue.some((entry) => (entry.payload as any)?.id === 'queued_exam_104'));
});
