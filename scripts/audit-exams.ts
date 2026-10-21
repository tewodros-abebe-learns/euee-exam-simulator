import { allOfficialExams } from '../src/data/sampleExams';

/**
 * Data sanity report for the official (bundled) exam bank.
 *
 * Errors block a release; warnings flag content that needs a human to review
 * the source booklet. Run with `npm run audit:exams`.
 */

type Exam = (typeof allOfficialExams)[number];

const MIN_EXPECTED_QUESTIONS = 40;

const errors: string[] = [];
const warnings: string[] = [];

const norm = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, ' ')
    .trim();

function auditExam(exam: Exam) {
  if (!exam.title) errors.push(`Exam ${exam.id ?? '?'} is missing a title`);
  if (!Array.isArray(exam.questions)) {
    errors.push(`Exam '${exam.title}' has no questions array`);
    return;
  }

  const label = `${exam.title} (${exam.id})`;
  const questionIds = new Set<string>();
  const seenStems = new Map<string, string>();

  if (exam.questions.length < MIN_EXPECTED_QUESTIONS) {
    warnings.push(`'${label}' only has ${exam.questions.length} questions — expected a full paper (${MIN_EXPECTED_QUESTIONS}+).`);
  }

  exam.questions.forEach((q, index) => {
    const where = `${label} Q${index + 1} (${q.id ?? 'no-id'})`;

    if (!q.id) errors.push(`${where} is missing an id`);
    else if (questionIds.has(q.id)) errors.push(`${label} reuses the question id '${q.id}'`);
    else questionIds.add(q.id);

    const stem = norm(q.question);
    if (!stem) {
      errors.push(`${where} has no question text`);
    } else if (seenStems.has(stem)) {
      warnings.push(`${where} repeats the stem of ${seenStems.get(stem)}`);
    } else {
      seenStems.set(stem, where);
    }

    if (!Array.isArray(q.options) || q.options.length < 2) {
      errors.push(`${where} has fewer than two options`);
    } else {
      const normalisedOptions = q.options.map(norm);
      const duplicates = normalisedOptions.filter((option, i) => option && normalisedOptions.indexOf(option) !== i);
      if (duplicates.length > 0) {
        warnings.push(`${where} has duplicate option text: ${[...new Set(duplicates)].join(' / ')}`);
      }
      if (normalisedOptions.some((option) => !option)) {
        warnings.push(`${where} has an empty option`);
      }
    }

    if (
      typeof q.correctAnswerIndex !== 'number' ||
      !Number.isInteger(q.correctAnswerIndex) ||
      q.correctAnswerIndex < 0 ||
      (Array.isArray(q.options) && q.correctAnswerIndex >= q.options.length)
    ) {
      errors.push(`${where} has an invalid correctAnswerIndex: ${q.correctAnswerIndex}`);
    }
  });
}

allOfficialExams.forEach(auditExam);

const totalQuestions = allOfficialExams.reduce((sum, exam) => sum + (exam.questions?.length ?? 0), 0);

console.log(`Audited ${allOfficialExams.length} official exams containing ${totalQuestions} questions.`);

if (warnings.length > 0) {
  console.log(`\n${warnings.length} content warning(s) to review against the printed booklet:`);
  warnings.forEach((warning) => console.log('  ! ' + warning));
}

if (errors.length > 0) {
  console.log(`\n${errors.length} structural error(s):`);
  errors.forEach((error) => console.log('  x ' + error));
  process.exitCode = 1;
} else {
  console.log('\nNo structural errors found in the official exam bank.');
}
