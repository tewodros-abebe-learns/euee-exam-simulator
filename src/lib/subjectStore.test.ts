import test from 'node:test';
import assert from 'node:assert/strict';
import { addSubject, listSubjects, removeSubject, subjectMatchesFolder, canonicalKey } from './subjectStore';

test('built-in subjects are always available', () => {
  const subjects = listSubjects();
  assert.ok(subjects.includes('Biology'));
  assert.ok(subjects.includes('General'));
});

test('adding a subject is idempotent and case-insensitive', () => {
  const first = addSubject('  Agricultural   Science ');
  assert.equal(first, 'Agricultural Science');
  const again = addSubject('agricultural science');
  assert.equal(again, 'Agricultural Science');
  assert.equal(listSubjects().filter((s) => s.toLowerCase() === 'agricultural science').length, 1);
  removeSubject('Agricultural Science');
});

test('adding a duplicate of a built-in returns the built-in', () => {
  assert.equal(addSubject('biology'), 'Biology');
  assert.equal(listSubjects().filter((s) => s.toLowerCase() === 'biology').length, 1);
});

test('unusable names are rejected', () => {
  assert.equal(addSubject('   '), null);
  assert.equal(addSubject('a'), null);
});

test('custom folders match their own subject, and General stays a catch-all', () => {
  addSubject('Geography');
  assert.equal(subjectMatchesFolder('Geography', 'Geography'), true);
  assert.equal(subjectMatchesFolder('geography', 'Geography'), true);
  assert.equal(subjectMatchesFolder('Biology', 'Geography'), false);
  assert.equal(subjectMatchesFolder('Biology', 'General'), true);
  removeSubject('Geography');
});

test('built-in aliases still resolve', () => {
  assert.equal(canonicalKey('Mathematics'), 'math');
  assert.equal(subjectMatchesFolder('Math', 'Math'), true);
});
