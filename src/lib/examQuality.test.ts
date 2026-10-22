import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareExamQuestions } from './examQuality';

const base = {
  id: 'q1',
  question: 'Stem?',
  options: ['a', 'b'],
  correctAnswerIndex: 1,
  explanation: '',
};

test('keeps well-formed questions untouched', () => {
  const { questions, dropped, repaired } = prepareExamQuestions([base]);
  assert.equal(dropped, 0);
  assert.equal(repaired, 0);
  assert.equal(questions[0].correctAnswerIndex, 1);
});

test('drops questions that could never be answered', () => {
  const { questions, dropped } = prepareExamQuestions([
    { ...base, question: '   ' },
    { ...base, id: 'q2', options: ['only one'] },
    { ...base, id: 'q3', options: [] },
    base,
  ]);
  assert.equal(questions.length, 1);
  assert.equal(dropped, 3);
});

test('repairs duplicate and missing ids so React keys stay unique', () => {
  const { questions, repaired } = prepareExamQuestions([
    base,
    { ...base, question: 'Second?' },
    { ...base, id: '', question: 'Third?' },
  ]);
  const ids = questions.map((q) => q.id);
  assert.equal(new Set(ids).size, 3);
  assert.ok(repaired >= 2);
});

test('an out-of-range answer index becomes ungraded instead of wrong', () => {
  const { questions } = prepareExamQuestions([{ ...base, correctAnswerIndex: 7 }]);
  assert.equal(questions[0].correctAnswerIndex, -1);
});

test('-1 is preserved (practice-only questions keep working)', () => {
  const { questions, repaired } = prepareExamQuestions([{ ...base, correctAnswerIndex: -1 }]);
  assert.equal(questions[0].correctAnswerIndex, -1);
  assert.equal(repaired, 0);
});

test('non-string options are discarded rather than rendered as objects', () => {
  const { questions } = prepareExamQuestions([
    { ...base, options: ['a', 42 as any, 'b'] },
  ]);
  assert.deepEqual(questions[0].options, ['a', 'b']);
});

test('removing an empty option keeps the answer key pointing at the same text', () => {
  // ["A", "", "C"] with key 2 ("C") must still resolve to "C", not to a
  // shifted neighbour and not to -1.
  const { questions } = prepareExamQuestions([
    { ...base, options: ['A', '', 'C', 'D'], correctAnswerIndex: 2 },
  ]);
  assert.deepEqual(questions[0].options, ['A', 'C', 'D']);
  assert.equal(questions[0].options[questions[0].correctAnswerIndex], 'C');
});

test('a key that pointed at an empty option becomes ungraded, never wrong', () => {
  const { questions } = prepareExamQuestions([
    { ...base, options: ['A', '', 'C'], correctAnswerIndex: 1 },
  ]);
  assert.equal(questions[0].correctAnswerIndex, -1);
});
