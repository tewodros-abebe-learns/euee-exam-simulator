import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXAM_SCHEMA_VERSION,
  UNGRADED_ANSWER_INDEX,
  examToJsonString,
  examToMarkdown,
  parseExamJson,
} from './examSchema';
import { parseExamText, stripCodeFence, detectFormat, extractMarkdownAnswerKey } from './examImport';
import { gradeExam } from './scoring';

const canonical = {
  schemaVersion: 1,
  title: 'Physics — Unit 3',
  subject: 'Physics',
  grade: 'Grade 12',
  timeLimit: 3600,
  questions: [
    { id: 'q1', question: 'SI unit of force?', options: ['Joule', 'Newton', 'Watt', 'Pascal'], correctAnswerIndex: 1 },
    { id: 'q2', question: 'Which is a vector?', options: ['Speed', 'Mass', 'Velocity', 'Time'], correctAnswer: 'C' },
  ],
};

test('imports the canonical JSON shape', () => {
  const report = parseExamJson(JSON.stringify(canonical));
  assert.equal(report.ok, true);
  assert.equal(report.exam?.title, 'Physics — Unit 3');
  assert.equal(report.exam?.timeLimit, 3600);
  assert.equal(report.exam?.questions.length, 2);
  assert.equal(report.exam?.questions[0].correctAnswerIndex, 1);
  assert.equal(report.exam?.questions[1].correctAnswerIndex, 2);
  assert.equal(report.stats.graded, 2);
  assert.equal(report.stats.ungraded, 0);
});

test('accepts bare arrays, wrapped objects and answer maps', () => {
  const bare = parseExamJson(
    JSON.stringify([{ question: 'Q?', options: { A: 'one', B: 'two' }, correctAnswerIndex: 0 }])
  );
  assert.equal(bare.ok, true);
  assert.deepEqual(bare.exam?.questions[0].options, ['one', 'two']);

  const wrapped = parseExamJson(JSON.stringify({ exam: { questions: canonical.questions } }));
  assert.equal(wrapped.ok, true);
  assert.equal(wrapped.exam?.questions.length, 2);

  const withKey = parseExamJson(
    JSON.stringify({
      questions: [
        { question: 'One?', options: ['a', 'b', 'c'] },
        { question: 'Two?', options: ['d', 'e', 'f'] },
      ],
      answerKey: { 1: 'C', 2: 'A' },
    })
  );
  assert.equal(withKey.ok, true);
  assert.equal(withKey.exam?.questions[0].correctAnswerIndex, 2);
  assert.equal(withKey.exam?.questions[1].correctAnswerIndex, 0);
});

test('accepts option-object correctness flags and prefixed option text', () => {
  const report = parseExamJson(
    JSON.stringify({
      questions: [
        {
          question: 'Pick one',
          options: [
            { text: 'A) wrong' },
            { text: 'B) right', isCorrect: true },
          ],
        },
      ],
    })
  );
  assert.equal(report.ok, true);
  assert.deepEqual(report.exam?.questions[0].options, ['wrong', 'right']);
  assert.equal(report.exam?.questions[0].correctAnswerIndex, 1);
});

test('never guesses an answer that the file does not state', () => {
  const report = parseExamJson(
    JSON.stringify({ questions: [{ question: 'Unkeyed?', options: ['a', 'b', 'c'] }] })
  );
  assert.equal(report.ok, true);
  assert.equal(report.exam?.questions[0].correctAnswerIndex, UNGRADED_ANSWER_INDEX);
  assert.equal(report.stats.ungraded, 1);
  assert.ok(report.issues.some((issue) => /No answer key/.test(issue.message)));
});

test('rejects unusable questions but keeps the rest', () => {
  const report = parseExamJson(
    JSON.stringify({
      questions: [
        { question: 'Good?', options: ['a', 'b'], correctAnswerIndex: 0 },
        { question: '', options: ['a', 'b'], correctAnswerIndex: 0 },
        { question: 'Only one?', options: ['a'], correctAnswerIndex: 0 },
        'not an object',
      ],
    })
  );
  assert.equal(report.ok, true);
  assert.equal(report.stats.accepted, 1);
  assert.equal(report.stats.rejected, 3);
  assert.equal(report.exam?.questions.length, 1);
});

test('rejects malformed JSON with a readable error', () => {
  const report = parseExamJson('{ "questions": [ }');
  assert.equal(report.ok, false);
  assert.equal(report.exam, null);
  assert.ok(report.issues.some((issue) => issue.level === 'error'));
});

test('JSON round-trips through export', () => {
  const first = parseExamJson(JSON.stringify(canonical));
  const exported = examToJsonString({
    title: first.exam!.title,
    subject: first.exam!.subject,
    grade: first.exam!.grade,
    timeLimit: first.exam!.timeLimit,
    questions: first.exam!.questions,
  });
  const second = parseExamJson(exported);
  assert.equal(second.ok, true);
  assert.deepEqual(
    second.exam?.questions.map((q) => [q.question, q.options, q.correctAnswerIndex]),
    first.exam?.questions.map((q) => [q.question, q.options, q.correctAnswerIndex])
  );
});

test('Markdown export round-trips through the Markdown importer', () => {
  const exam = {
    title: 'Biology Set 1',
    subject: 'Biology',
    grade: 'Grade 11',
    questions: [
      { id: 'q1', question: 'Powerhouse of the cell?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Chloroplast'], correctAnswerIndex: 1, explanation: 'ATP.' },
      { id: 'q2', question: 'DNA base pairs?', options: ['A-T', 'A-G', 'C-T', 'G-U'], correctAnswerIndex: 0, explanation: '' },
    ],
  };
  const markdown = examToMarkdown(exam);
  const report = parseExamText(markdown, { subject: 'Biology' });
  assert.equal(report.ok, true);
  assert.equal(report.format, 'markdown');
  assert.equal(report.exam?.questions.length, 2);
  assert.equal(report.exam?.title, 'Biology Set 1');
  assert.deepEqual(
    report.exam?.questions.map((q) => q.correctAnswerIndex),
    [1, 0]
  );
});

test('Markdown answer key is read and applied', () => {
  const markdown = `# Quiz

1. Capital of Ethiopia?
A) Nairobi
B) Addis Ababa
C) Cairo
D) Lagos

2. 2 + 2 = ?
A) 3
B) 4
C) 5
D) 6

## Answer Key
1. B   2. B
`;
  const report = parseExamText(markdown);
  assert.equal(report.ok, true);
  assert.equal(report.exam?.questions.length, 2);
  assert.deepEqual(report.exam?.questions.map((q) => q.correctAnswerIndex), [1, 1]);
});

test('extractMarkdownAnswerKey handles several key notations', () => {
  const variants = ['1. B\n2. C', '1-B, 2-C', 'Q1: B\nQ2: C', '1) B | 2) C'];
  for (const variant of variants) {
    const result = extractMarkdownAnswerKey(`1. x\n\nAnswers\n${variant}`);
    assert.equal(result.answers.get(1), 'B', variant);
    assert.equal(result.answers.get(2), 'C', variant);
  }
});

test('code fences from AI chats are stripped', () => {
  const fenced = '```json\n{"questions":[]}\n```';
  assert.equal(stripCodeFence(fenced), '{"questions":[]}');
  assert.equal(detectFormat(fenced), 'json');
  assert.equal(detectFormat('# Title\n1. Question'), 'markdown');
});

test('a Markdown file with no key imports as practice-only', () => {
  const report = parseExamText(`1. What is 5 + 3?
A) 6
B) 7
C) 8
D) 9`);
  assert.equal(report.ok, true);
  assert.equal(report.exam?.questions[0].correctAnswerIndex, UNGRADED_ANSWER_INDEX);
  assert.ok(report.issues.some((issue) => /practice mode/.test(issue.message)));

  const graded = gradeExam(report.exam!.questions, { 'q-1': '8' });
  assert.equal(graded.graded, 0);
  assert.equal(graded.ungraded, 1);
  assert.equal(graded.incorrect, 0);
  assert.equal(graded.percentage, 0);
});

test('schema version is carried in the export', () => {
  const exported = JSON.parse(examToJsonString({ title: 'T', subject: 'Math', questions: [] }));
  assert.equal(exported.schemaVersion, EXAM_SCHEMA_VERSION);
});
