import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectDelimiter,
  isCsvExam,
  parseDelimited,
  parseExamCsv,
  resolveCsvAnswer,
} from './csvImport';
import { detectFormat, parseExamText } from './examImport';
import {
  buildSampleCsv,
  buildSampleJson,
  buildSampleMarkdown,
  buildSampleText,
} from './examSamples';

const header = 'question,option_a,option_b,option_c,option_d,correct_answer,explanation';

test('every downloadable sample imports back into the app', () => {
  const samples: [string, string][] = [
    ['json', buildSampleJson()],
    ['markdown', buildSampleMarkdown()],
    ['text', buildSampleText()],
    ['csv', buildSampleCsv()],
  ];

  for (const [name, raw] of samples) {
    const report = parseExamText(raw, { subject: 'Biology', title: 'Sample' });
    assert.equal(report.ok, true, `${name} should import`);
    assert.equal(report.exam?.questions.length, 7, `${name} should import 7 questions`);
    assert.equal(report.stats.graded, 6, `${name} should grade 6 questions`);
    assert.equal(report.stats.ungraded, 1, `${name} should keep 1 practice item`);
    assert.equal(
      report.issues.filter((issue) => issue.level === 'error').length,
      0,
      `${name} should import without errors`
    );
  }
});

test('a spreadsheet exports and imports the answer key intact', () => {
  const csv = [
    header,
    'What is 2 + 2?,1,2,3,4,C,',
    '"Which gas, at room temperature, is diatomic?",Oxygen,Helium,Neon,Argon,A,',
    'True or false: water boils at 100 °C.,True,False,,,A,',
  ].join('\n');

  const report = parseExamCsv(csv, { title: 'Numbers' });
  assert.equal(report.ok, true);
  assert.equal(report.exam?.questions.length, 3);
  assert.deepEqual(
    report.exam?.questions.map((question) => question.correctAnswerIndex),
    [2, 0, 0]
  );
  assert.equal(report.exam?.questions[1].question, 'Which gas, at room temperature, is diatomic?');
});

test('quoted fields, CRLF, a BOM and semicolons all parse', () => {
  const csv =
    '\uFEFFQuestion;Option A;Option B;Option C;Option D;Answer\r\n' +
    '"A sentence with;semicolons";one;two;three;four;C\r\n' +
    '"A multi-line\nstem";alpha;beta;gamma;delta;A\r\n';

  assert.equal(detectDelimiter(csv), ';');
  const rows = parseDelimited(csv, ';');
  assert.equal(rows.length, 3);
  assert.equal(rows[2][0], 'A multi-line\nstem');

  const report = parseExamCsv(csv);
  assert.equal(report.ok, true);
  assert.equal(report.exam?.questions.length, 2);
  assert.equal(report.exam?.questions[0].options[2], 'three');
  assert.equal(report.exam?.questions[1].correctAnswerIndex, 0);
});

test('an unused option column does not shift the answer', () => {
  // A spreadsheet often has a fifth option column that is empty. An "A" answer
  // must still mean the first option, and an "E" answer cannot be resolved.
  const csv = [
    header,
    'Four option question,a,b,c,d,B,',
    'Fifth option missing,a,b,c,d,E,',
  ].join('\n');

  const report = parseExamCsv(csv);
  assert.equal(report.exam?.questions[0].options.length, 4);
  assert.equal(report.exam?.questions[0].correctAnswerIndex, 1);
  assert.equal(report.exam?.questions[1].correctAnswerIndex, -1);
  assert.ok(
    report.issues.some((issue) => issue.message.includes('does not match any option')),
    'the unusable key should be reported, never guessed'
  );
});

test('a single options column, tab separators and text answers work', () => {
  const csv = [
    'question\toptions\tcorrect_answer',
    'Pick the capital of Kenya\tNairobi | Mombasa | Kisumu\tNairobi',
    'Pick an even number\t3;5;8\t8',
  ].join('\n');

  assert.equal(detectFormat(csv), 'csv');
  const report = parseExamCsv(csv);
  assert.equal(report.ok, true);
  assert.equal(report.exam?.questions[0].correctAnswerIndex, 0);
  assert.equal(report.exam?.questions[1].correctAnswerIndex, 2);
  assert.deepEqual(report.exam?.questions[1].options, ['3', '5', '8']);
});

test('numeric answers are 1-based, and 0 means the first option', () => {
  assert.equal(resolveCsvAnswer('1', ['a', 'b', 'c', 'd']), 0);
  assert.equal(resolveCsvAnswer('4', ['a', 'b', 'c', 'd']), 3);
  assert.equal(resolveCsvAnswer('0', ['a', 'b', 'c', 'd']), 0);
  assert.equal(resolveCsvAnswer('', ['a', 'b']), -1);
  assert.equal(resolveCsvAnswer('Z', ['a', 'b']), -1);
});

test('a CSV without a usable header is rejected with a readable message', () => {
  const report = parseExamCsv('1. What is 2+2?\nA) 3\nB) 4\n\n2. Next?\nA) x\nB) y');
  assert.equal(report.ok, false);
  assert.match(report.issues[0].message, /header/i);
});

test('plain prose is still treated as a text paper, not as CSV', () => {
  assert.equal(isCsvExam('1. What is the capital of Kenya?\nA) Nairobi\nB) Mombasa'), false);
  assert.equal(detectFormat('1. What is the capital?\nA) Nairobi\nB) Mombasa'), 'markdown');
  assert.equal(detectFormat('question,option_a,option_b,correct_answer\nQ?,a,b,A'), 'csv');
});
