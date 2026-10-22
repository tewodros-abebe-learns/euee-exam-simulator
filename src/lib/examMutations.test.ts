import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyExamMutations,
  clearExamMutation,
  getExamMutations,
  isExamDeleted,
  overlayExamMutation,
  queueExamDelete,
  queueExamUpdate,
} from './examMutations';

const exam = { id: 'exam-1', title: 'Old title', subject: 'Biology' };

test('a pending rename wins over a stale cloud copy', () => {
  queueExamUpdate('exam-1', { title: 'New title' });
  const merged = overlayExamMutation(exam);
  assert.equal(merged?.title, 'New title');
  assert.equal(merged?.subject, 'Biology');
  clearExamMutation('exam-1');
  assert.deepEqual(getExamMutations(), []);
});

test('two quick edits are merged, and a later one wins', () => {
  queueExamUpdate('exam-1', { title: 'First' });
  queueExamUpdate('exam-1', { subject: 'Chemistry' });
  const pending = getExamMutations();
  assert.equal(pending.length, 1);
  assert.deepEqual(pending[0].type === 'update' ? pending[0].fields : null, {
    title: 'First',
    subject: 'Chemistry',
  });
  clearExamMutation('exam-1');
});

test('a pending delete hides the exam until the backend confirms', () => {
  queueExamDelete('exam-1');
  assert.equal(isExamDeleted('exam-1'), true);
  assert.equal(overlayExamMutation(exam), null);
  assert.deepEqual(applyExamMutations([exam, { id: 'exam-2', title: 'Keep me' }]).map((e) => e.id), [
    'exam-2',
  ]);
  clearExamMutation('exam-1');
  assert.equal(isExamDeleted('exam-1'), false);
});

test('a delete supersedes a pending rename for the same exam', () => {
  queueExamUpdate('exam-1', { title: 'Renamed' });
  queueExamDelete('exam-1');
  const pending = getExamMutations();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].type, 'delete');
  clearExamMutation('exam-1');
});

test('clearing an unknown id changes nothing', () => {
  clearExamMutation('nope');
  assert.deepEqual(getExamMutations(), []);
});
