import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isUsableQuestion,
  parseActiveExamState,
  readActiveExamState,
  sanitizeQuestions,
  fitsInStorage,
} from './activeExamState';
import { ACTIVE_EXAM_STATE_KEY } from './examProgress';

const question = (n: number) => ({
  id: `q${n}`,
  question: `Question ${n}?`,
  options: ['A', 'B', 'C', 'D'],
  correctAnswerIndex: 0,
  explanation: 'Because.',
});

const validState = {
  examQuestions: [question(1), question(2)],
  examTitle: 'Biology — Cells',
  selectedSubject: 'Biology',
  selectedGrade: 'General',
  currentExamId: 'exam_1',
  currentSessionId: 'session_1',
  timeLimit: 1200,
  startTime: Date.now() - 60_000,
  saveProgress: true,
};

test('a complete snapshot restores every field', () => {
  const state = parseActiveExamState(JSON.stringify(validState));
  assert.ok(state);
  assert.equal(state!.examQuestions.length, 2);
  assert.equal(state!.examTitle, 'Biology — Cells');
  assert.equal(state!.timeLimit, 1200);
  assert.equal(state!.saveProgress, true);
});

test('corrupt or empty snapshots never produce an exam', () => {
  assert.equal(parseActiveExamState(null), null);
  assert.equal(parseActiveExamState(''), null);
  assert.equal(parseActiveExamState('{not json'), null);
  assert.equal(parseActiveExamState('null'), null);
  assert.equal(parseActiveExamState('[]'), null);
  // Questions missing, empty, or of the wrong shape must all be refused.
  assert.equal(parseActiveExamState(JSON.stringify({ ...validState, examQuestions: [] })), null);
  assert.equal(parseActiveExamState(JSON.stringify({ ...validState, examQuestions: 'oops' })), null);
  assert.equal(
    parseActiveExamState(JSON.stringify({ ...validState, examQuestions: [{ question: '', options: [] }] })),
    null
  );
});

test('null array entries from a JSON round-trip are dropped, not rendered', () => {
  // JSON.stringify turns a hole/undefined entry into null; the old restore then
  // hit `questions[0] === null` and showed "No questions found".
  const raw = JSON.stringify({ ...validState, examQuestions: [null, question(1), undefined] });
  const state = parseActiveExamState(raw);
  assert.ok(state);
  assert.equal(state!.examQuestions.length, 1);
  assert.equal(state!.examQuestions[0].id, 'q1');
});

test('a question needs a stem and at least two options', () => {
  assert.equal(isUsableQuestion({ question: 'Hi?', options: ['A', 'B'] }), true);
  assert.equal(isUsableQuestion({ question: 'Hi?', options: ['A'] }), false);
  assert.equal(isUsableQuestion({ question: '   ', options: ['A', 'B'] }), false);
  assert.equal(isUsableQuestion({ question: 'Hi?', options: ['A', 2] }), false);
  assert.equal(isUsableQuestion(null), false);
  assert.deepEqual(sanitizeQuestions('nope'), []);
});

test('a snapshot without a start time is refused (the clock could not resume)', () => {
  const { startTime, ...withoutStart } = validState;
  assert.equal(parseActiveExamState(JSON.stringify(withoutStart)), null);
  // A single-player practice attempt has no limit; that is still valid.
  const untimed = parseActiveExamState(JSON.stringify({ ...validState, timeLimit: null }));
  assert.ok(untimed);
  assert.equal(untimed!.timeLimit, null);
});

test('readActiveExamState tolerates a storage that throws', () => {
  const okStorage = {
    getItem: (key: string) => (key === ACTIVE_EXAM_STATE_KEY ? JSON.stringify(validState) : null),
  } as unknown as Storage;
  assert.equal(readActiveExamState(okStorage)?.examQuestions.length, 2);

  const hostile = {
    getItem: () => {
      throw new Error('SecurityError');
    },
  } as unknown as Storage;
  assert.equal(readActiveExamState(hostile), null);
  assert.equal(readActiveExamState(null), null);
});

test('oversized snapshots are detected before they hit the quota', () => {
  assert.equal(fitsInStorage({ a: 'x'.repeat(100) }, 1000), true);
  assert.equal(fitsInStorage({ a: 'x'.repeat(2000) }, 1000), false);
  const circular: any = {};
  circular.self = circular;
  assert.equal(fitsInStorage(circular), false);
});
