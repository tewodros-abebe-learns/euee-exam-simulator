import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeExam, isAnswerCorrect, getCorrectAnswer, filterValidQuestions } from './scoring';
import type { Question } from '../services/geminiService';

const q = (id: string, options: string[], correctAnswerIndex: number): Question => ({
  id,
  question: `Question ${id}?`,
  options,
  correctAnswerIndex,
  explanation: 'Because.',
});

const questions = [
  q('q1', ['alpha', 'beta', 'gamma', 'delta'], 1),
  q('q2', ['one', 'two', 'three', 'four'], 3),
  q('q3', ['red', 'green', 'blue', 'black'], 0),
];

test('grades by option text, not by parseInt of the answer', () => {
  const result = gradeExam(questions, {
    q1: 'beta', // correct
    q2: 'two', // incorrect
    // q3 skipped
  });
  assert.equal(result.correct, 1);
  assert.equal(result.incorrect, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.answered, 2);
  assert.equal(result.total, 3);
  assert.equal(result.percentage, 33);
});

test('numeric-looking option text is graded correctly (regression)', () => {
  // The old implementation compared parseInt(answer) with the index, so a
  // numeric option such as "2" could be mis-graded or produce NaN.
  const numeric = [q('n1', ['1', '2', '3', '4'], 1)];
  assert.equal(gradeExam(numeric, { n1: '2' }).correct, 1);
  assert.equal(gradeExam(numeric, { n1: '1' }).correct, 0);
});

test('perfect and empty attempts', () => {
  const all = gradeExam(questions, { q1: 'beta', q2: 'four', q3: 'red' });
  assert.equal(all.percentage, 100);
  assert.equal(all.skipped, 0);

  const none = gradeExam(questions, {});
  assert.equal(none.correct, 0);
  assert.equal(none.percentage, 0);
  assert.equal(none.skipped, 3);
});

test('unknown answers never count as correct', () => {
  assert.equal(isAnswerCorrect(questions[0], 'B'), false);
  assert.equal(isAnswerCorrect(questions[0], undefined), false);
  assert.equal(isAnswerCorrect(questions[0], ''), false);
  assert.equal(isAnswerCorrect(questions[0], 'alpha'), false);
  assert.equal(isAnswerCorrect(questions[0], 'beta'), true);
});

test('an invalid answer index yields no correct answer', () => {
  assert.equal(getCorrectAnswer(q('bad', ['a', 'b'], 5)), undefined);
  assert.equal(getCorrectAnswer(q('bad2', ['a', 'b'], -1)), undefined);
  assert.equal(getCorrectAnswer(undefined), undefined);
});

test('structurally broken AI questions are filtered out', () => {
  const valid = q('ok', ['a', 'b', 'c', 'd'], 2);
  const invalid = [
    { ...q('empty', ['a', 'b'], 0), question: '   ' },
    { ...q('noOptions', [], 0) },
    { ...q('badIndex', ['a', 'b'], 9) },
    { ...q('blankOption', ['a', '  '], 0) },
    { id: 'noQuestionText', options: ['a', 'b'], correctAnswerIndex: 0 },
  ];
  const filtered = filterValidQuestions([valid, ...invalid]);
  assert.deepEqual(filtered.map((item) => item.id), ['ok']);
});
