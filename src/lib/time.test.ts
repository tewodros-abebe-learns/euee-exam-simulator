import test from 'node:test';
import assert from 'node:assert/strict';
import { formatClock, formatDuration, computeDeadline, remainingSeconds } from './time';
import { normalizeSubject, matchesSubject } from './subjects';
import { parseExamHeuristicallyDetailed } from './heuristicExamParser';

test('formatClock renders mm:ss and h:mm:ss', () => {
  assert.equal(formatClock(0), '00:00');
  assert.equal(formatClock(65), '01:05');
  assert.equal(formatClock(3600), '1:00:00');
  assert.equal(formatClock(-5), '00:00');
});

test('formatDuration is human readable', () => {
  assert.equal(formatDuration(45), '45s');
  assert.equal(formatDuration(125), '2m 5s');
  assert.equal(formatDuration(3900), '1h 5m');
});

test('the countdown is derived from an absolute deadline', () => {
  const start = 1_000_000;
  const deadline = computeDeadline(start, 60);
  assert.equal(deadline, start + 60_000);
  assert.equal(remainingSeconds(deadline, start), 60);
  assert.equal(remainingSeconds(deadline, start + 30_000), 30);
  assert.equal(remainingSeconds(deadline, start + 90_000), 0);
  assert.equal(computeDeadline(start, 0), null);
  assert.equal(remainingSeconds(null), null);
});

test('subject aliases collapse onto one folder', () => {
  assert.equal(normalizeSubject('Mathematics'), 'Math');
  assert.equal(normalizeSubject('Scholastic Aptitude'), 'Aptitude');
  assert.equal(normalizeSubject('unknown thing'), 'General');
  assert.ok(matchesSubject('Mathematics', 'Math'));
  assert.ok(matchesSubject('Scholastic Aptitude', 'Aptitude'));
  assert.ok(matchesSubject('Physics', 'General'));
  assert.ok(!matchesSubject('Physics', 'Chemistry'));
});

test('heuristic parser refuses to invent options or answer keys', () => {
  const noOptions = parseExamHeuristicallyDetailed('1. What is the capital of Ethiopia?\n2. Name a river.');
  assert.equal(noOptions.data, null);
  assert.equal(noOptions.confidence, 'low');

  const noAnswerKey = parseExamHeuristicallyDetailed(
    '1. What is 2 + 2?\nA) 3\nB) 4\nC) 5\nD) 6\n2. What is 3 + 3?\nA) 5\nB) 6\nC) 7\nD) 8'
  );
  assert.equal(noAnswerKey.confidence, 'low');
});

test('heuristic parser extracts a confident exam when options and keys exist', () => {
  const text = [
    '1. What is 2 + 2?',
    'A) 3',
    'B) 4',
    'C) 5',
    'D) 6',
    'Answer: B',
    '2. What is 3 + 3?',
    'A) 5',
    'B) 6',
    'C) 7',
    'D) 8',
    'Answer: B',
  ].join('\n');

  const parsed = parseExamHeuristicallyDetailed(text, 'Arithmetic');
  assert.equal(parsed.confidence, 'high');
  assert.equal(parsed.data?.questions.length, 2);
  const [first, second] = parsed.data!.questions;
  assert.deepEqual(first.options, ['3', '4', '5', '6']);
  assert.equal(first.correctAnswerIndex, 1);
  assert.equal(second.correctAnswerIndex, 1);
  assert.ok(!first.options.some((option) => option.startsWith('Option')));
});
