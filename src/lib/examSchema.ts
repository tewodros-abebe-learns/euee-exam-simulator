import type { Question } from '../services/geminiService';

/**
 * Portable exam format (v1).
 *
 * This is the contract between "something that produced a file" (a student's
 * notes, an AI chat, a spreadsheet export, another copy of this app) and the
 * app itself. Importing it is fully deterministic and offline: no API key, no
 * quota, and nothing can be hallucinated on the way in.
 *
 * ```json
 * {
 *   "schemaVersion": 1,
 *   "title": "Physics — Unit 3",
 *   "subject": "Physics",
 *   "grade": "Grade 12",
 *   "timeLimit": 3600,
 *   "questions": [
 *     {
 *       "id": "q1",
 *       "question": "What is $9.8\\ \\text{m/s}^2$?",
 *       "options": ["Acceleration due to gravity", "Planck's constant"],
 *       "correctAnswerIndex": 0,
 *       "explanation": "…"
 *     }
 *   ]
 * }
 * ```
 *
 * Leniency is intentional: options may be strings, `{ text }` objects or an
 * `{ A: "…", B: "…" }` map, and the answer may be an index, a letter, a
 * 1-based number, or the full option text. Anything that cannot be resolved
 * unambiguously is reported instead of guessed.
 */

export const EXAM_SCHEMA_VERSION = 1;

export interface ImportedExam {
  schemaVersion: number;
  title: string;
  subject: string;
  grade: string;
  /** Seconds. Omitted when the student picks a timer themselves. */
  timeLimit?: number;
  questions: Question[];
}

export type ImportIssueLevel = 'error' | 'warning';

export interface ImportIssue {
  level: ImportIssueLevel;
  message: string;
  /** 1-based position in the source file, when applicable. */
  questionNumber?: number;
}

export interface ImportStats {
  total: number;
  accepted: number;
  rejected: number;
  graded: number;
  ungraded: number;
}

export interface ImportReport {
  /** True when at least one usable question was produced. */
  ok: boolean;
  exam: ImportedExam | null;
  issues: ImportIssue[];
  stats: ImportStats;
  format: 'json' | 'markdown';
}

export interface ImportDefaults {
  subject?: string;
  grade?: string;
  title?: string;
}

const LETTERS = 'ABCDEFGHIJ';

/** No usable answer key: the question is imported but never scored. */
export const UNGRADED_ANSWER_INDEX = -1;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const firstDefined = (...values: unknown[]): unknown =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/** Removes a leading "A)" / "B." / "- " marker from an option's text. */
function cleanOptionText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/^\s*[(\[]?[A-Ja-j][)\].:]\s+/, '')
    .trim();
}

function toBoundedInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return parseInt(value.trim(), 10);
  return null;
}

function letterToIndex(value: string): number | null {
  const match = /^\s*[(\[]?([A-Ja-j])[)\].:]?\s*$/.exec(value);
  if (!match) return null;
  return LETTERS.indexOf(match[1].toUpperCase());
}

function slugifyTitle(value: string): string {
  return value.replace(/\.[^./\\]+$/, '').replace(/[_-]+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

interface OptionSet {
  options: string[];
  /** Index flagged by `{ isCorrect: true }` option objects, if any. */
  flaggedCorrect: number | null;
}

function normalizeOptions(raw: unknown): OptionSet {
  const options: string[] = [];
  let flaggedCorrect: number | null = null;

  if (Array.isArray(raw)) {
    raw.forEach((entry) => {
      if (typeof entry === 'string') {
        options.push(cleanOptionText(entry));
        return;
      }
      if (!isRecord(entry)) {
        options.push('');
        return;
      }
      const text = cleanOptionText(
        firstDefined(entry.text, entry.value, entry.option, entry.label, entry.answer, entry.content)
      );
      if (entry.isCorrect === true || entry.correct === true || entry.is_correct === true) {
        flaggedCorrect = options.length;
      }
      options.push(text);
    });
  } else if (isRecord(raw)) {
    // { "A": "...", "B": "..." }
    Object.keys(raw).forEach((key) => {
      const entry = (raw as Record<string, any>)[key];
      if (typeof entry === 'string') {
        options.push(cleanOptionText(entry));
      } else if (isRecord(entry)) {
        options.push(
          cleanOptionText(firstDefined(entry.text, entry.value, entry.option, entry.label, entry.answer))
        );
        if (entry.isCorrect === true || entry.correct === true) flaggedCorrect = options.length - 1;
      }
    });
  }

  return { options, flaggedCorrect };
}

// ---------------------------------------------------------------------------
// Answer resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the answer key without ever guessing.
 * Returns `UNGRADED_ANSWER_INDEX` when the source does not state one.
 */
function resolveAnswerIndex(
  question: Record<string, any>,
  options: string[],
  flaggedCorrect: number | null
): number {
  const inRange = (index: number | null) =>
    index !== null && Number.isInteger(index) && index >= 0 && index < options.length ? index : null;

  const explicitIndex = inRange(
    toBoundedInteger(
      firstDefined(
        question.correctAnswerIndex,
        question.correct_index,
        question.correctIndex,
        question.answerIndex,
        question.answer_index,
        question.correctOptionIndex,
        question.correct_option_index
      )
    )
  );
  if (explicitIndex !== null) return explicitIndex;

  if (flaggedCorrect !== null && flaggedCorrect >= 0 && flaggedCorrect < options.length) {
    return flaggedCorrect;
  }

  const rawAnswer = firstDefined(
    question.correctAnswer,
    question.correct_answer,
    question.answer,
    question.key,
    question.correct,
    question.correctOption,
    question.correct_option
  );

  if (rawAnswer === undefined || rawAnswer === null) return UNGRADED_ANSWER_INDEX;
  if (Array.isArray(rawAnswer)) return UNGRADED_ANSWER_INDEX;

  if (typeof rawAnswer === 'number') {
    // Numeric answers are 1-based ("2" means option B); 0 means option A.
    const zeroBased = rawAnswer === 0 ? 0 : rawAnswer - 1;
    return inRange(zeroBased) ?? UNGRADED_ANSWER_INDEX;
  }

  const text = String(rawAnswer).trim();
  if (!text) return UNGRADED_ANSWER_INDEX;

  const asLetter = letterToIndex(text);
  if (asLetter !== null) return inRange(asLetter) ?? UNGRADED_ANSWER_INDEX;

  if (/^\d+$/.test(text)) {
    const numeric = parseInt(text, 10);
    return inRange(numeric === 0 ? 0 : numeric - 1) ?? UNGRADED_ANSWER_INDEX;
  }

  const normalizedAnswer = normalizeOptionForMatch(text);
  const matchIndex = options.findIndex((option) => normalizeOptionForMatch(option) === normalizedAnswer);
  return matchIndex >= 0 ? matchIndex : UNGRADED_ANSWER_INDEX;
}

const normalizeOptionForMatch = (value: string): string =>
  value
    .toLowerCase()
    .replace(/^\s*[(\[]?[a-j][)\].:]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

// ---------------------------------------------------------------------------
// JSON import
// ---------------------------------------------------------------------------

export function parseExamJson(raw: string, defaults: ImportDefaults = {}): ImportReport {
  const issues: ImportIssue[] = [];
  const stats: ImportStats = { total: 0, accepted: 0, rejected: 0, graded: 0, ungraded: 0 };

  const fail = (message: string): ImportReport => {
    issues.push({ level: 'error', message });
    return { ok: false, exam: null, issues, stats, format: 'json' };
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error: any) {
    return fail(`This file is not valid JSON: ${error?.message || 'unexpected character'}.`);
  }

  // Accept a bare array, `{ exam: {…} }`, or the canonical object.
  let root: Record<string, any>;
  if (Array.isArray(parsed)) {
    root = { questions: parsed };
  } else if (isRecord(parsed) && Array.isArray(parsed.questions)) {
    root = parsed;
  } else if (isRecord(parsed) && isRecord(parsed.exam) && Array.isArray(parsed.exam.questions)) {
    root = parsed.exam;
  } else {
    return fail('No "questions" array was found. Export or generate a file in the app\'s exam JSON format.');
  }

  const rawQuestions = root.questions as unknown[];
  if (rawQuestions.length === 0) return fail('The file contains an empty "questions" array.');

  const schemaVersion = toBoundedInteger(root.schemaVersion);
  if (schemaVersion !== null && schemaVersion > EXAM_SCHEMA_VERSION) {
    issues.push({
      level: 'warning',
      message: `This file was written for schema v${schemaVersion}; this build understands v${EXAM_SCHEMA_VERSION}. Unknown fields are ignored.`,
    });
  }

  // Optional top-level answer key: { "1": "B", "2": "C" } or { "q1": "B" }.
  const topLevelKey: Record<string, any> = isRecord(root.answerKey)
    ? root.answerKey
    : isRecord(root.answer_key)
      ? root.answer_key
      : {};

  const questions: Question[] = [];
  const usedIds = new Set<string>();
  const seenStems = new Map<string, number>();

  rawQuestions.forEach((entry, position) => {
    const number = position + 1;

    if (!isRecord(entry)) {
      stats.total += 1;
      stats.rejected += 1;
      issues.push({ level: 'error', message: 'Entry is not an object.', questionNumber: number });
      return;
    }

    const text = normalizeText(
      firstDefined(entry.question, entry.text, entry.stem, entry.prompt, entry.title, entry.q)
    );
    const { options, flaggedCorrect } = normalizeOptions(
      firstDefined(entry.options, entry.choices, entry.answers, entry.alternatives)
    );
    const cleanedOptions = options.filter((option) => option.length > 0);

    stats.total += 1;

    if (!text) {
      stats.rejected += 1;
      issues.push({ level: 'error', message: 'Question text is missing.', questionNumber: number });
      return;
    }
    if (cleanedOptions.length < 2) {
      stats.rejected += 1;
      issues.push({
        level: 'error',
        message: `Only ${cleanedOptions.length} non-empty option(s); at least 2 are required.`,
        questionNumber: number,
      });
      return;
    }

    let answerIndex = resolveAnswerIndex(entry, cleanedOptions, flaggedCorrect);
    if (answerIndex === UNGRADED_ANSWER_INDEX) {
      const mapped = firstDefined(topLevelKey[String(number)], topLevelKey[`q${number}`]);
      if (mapped !== undefined) {
        answerIndex = resolveAnswerIndex({ correctAnswer: mapped }, cleanedOptions, null);
      }
    }

    const duplicateOptions = cleanedOptions.filter(
      (option, index) => normalizeOptionForMatch(option) && cleanedOptions.findIndex((other) => normalizeOptionForMatch(other) === normalizeOptionForMatch(option)) !== index
    );
    if (duplicateOptions.length > 0) {
      issues.push({
        level: 'warning',
        message: `Repeated option text: "${duplicateOptions[0].slice(0, 60)}".`,
        questionNumber: number,
      });
    }

    const stemKey = normalizeOptionForMatch(text);
    if (seenStems.has(stemKey)) {
      issues.push({
        level: 'warning',
        message: `Same question text as question ${seenStems.get(stemKey)}.`,
        questionNumber: number,
      });
    } else {
      seenStems.set(stemKey, number);
    }

    if (answerIndex === UNGRADED_ANSWER_INDEX) {
      issues.push({
        level: 'warning',
        message: 'No answer key for this question — it will be imported but never scored.',
        questionNumber: number,
      });
    }

    let id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `q-${number}`;
    if (usedIds.has(id)) id = `${id}-${number}`;
    usedIds.add(id);

    questions.push({
      id,
      question: text,
      options: cleanedOptions,
      correctAnswerIndex: answerIndex,
      explanation: normalizeText(firstDefined(entry.explanation, entry.reason, entry.solution, entry.rationale)),
      ...(normalizeText(entry.section) ? { section: normalizeText(entry.section) } : {}),
      ...(normalizeText(entry.instruction) ? { instruction: normalizeText(entry.instruction) } : {}),
      ...(normalizeText(entry.passage) ? { passage: normalizeText(entry.passage) } : {}),
      ...(normalizeText(entry.context) ? { context: normalizeText(entry.context) } : {}),
    });

    stats.accepted += 1;
    if (answerIndex >= 0) stats.graded += 1;
    else stats.ungraded += 1;
  });

  if (questions.length === 0) {
    issues.push({
      level: 'error',
      message: 'None of the questions could be imported. Fix the errors above and try again.',
    });
    return { ok: false, exam: null, issues, stats, format: 'json' };
  }

  const title =
    normalizeText(firstDefined(root.title, root.name, root.examTitle)) ||
    defaults.title ||
    'Imported Exam';

  const timeLimitRaw = firstDefined(root.timeLimit, root.time_limit, root.durationSeconds);
  const timeLimit = toBoundedInteger(timeLimitRaw);
  const timeLimitMinutes = toBoundedInteger(firstDefined(root.timeLimitMinutes, root.durationMinutes));

  const exam: ImportedExam = {
    schemaVersion: EXAM_SCHEMA_VERSION,
    title,
    subject: normalizeText(root.subject) || defaults.subject || 'General',
    grade: normalizeText(root.grade) || defaults.grade || 'Grade 12',
    ...(timeLimit && timeLimit > 0
      ? { timeLimit }
      : timeLimitMinutes && timeLimitMinutes > 0
        ? { timeLimit: timeLimitMinutes * 60 }
        : {}),
    questions,
  };

  return { ok: true, exam, issues, stats, format: 'json' };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export interface ExportableExam {
  title: string;
  subject: string;
  grade?: string;
  timeLimit?: number;
  questions: Question[];
}

/** Canonical JSON export — the exact shape `parseExamJson` reads back. */
export function examToJsonString(exam: ExportableExam): string {
  const payload = {
    schemaVersion: EXAM_SCHEMA_VERSION,
    title: exam.title,
    subject: exam.subject,
    grade: exam.grade || 'Grade 12',
    ...(exam.timeLimit && exam.timeLimit > 0 ? { timeLimit: exam.timeLimit } : {}),
    exportedAt: new Date().toISOString(),
    questions: (exam.questions || []).map((question, index) => ({
      id: question.id || `q-${index + 1}`,
      ...(question.section ? { section: question.section } : {}),
      ...(question.instruction ? { instruction: question.instruction } : {}),
      ...(question.passage ? { passage: question.passage } : {}),
      ...(question.context ? { context: question.context } : {}),
      question: question.question,
      options: question.options,
      ...(question.correctAnswerIndex >= 0 && question.correctAnswerIndex < question.options.length
        ? {
            correctAnswerIndex: question.correctAnswerIndex,
            correctAnswer: LETTERS[question.correctAnswerIndex] ?? undefined,
          }
        : {}),
      ...(question.explanation ? { explanation: question.explanation } : {}),
    })),
  };

  return JSON.stringify(payload, null, 2);
}

/** Human/AI-friendly Markdown export; imports back with `parseExamMarkdown`. */
export function examToMarkdown(exam: ExportableExam): string {
  const lines: string[] = [];
  lines.push(`# ${exam.title}`, '');
  lines.push(`Subject: ${exam.subject}`);
  if (exam.grade) lines.push(`Grade: ${exam.grade}`);
  if (exam.timeLimit && exam.timeLimit > 0) {
    lines.push(`Time limit: ${Math.round(exam.timeLimit / 60)} minutes`);
  }
  lines.push('');

  (exam.questions || []).forEach((question, index) => {
    const stem = question.passage ? `${question.passage}\n\n${question.question}` : question.question;
    lines.push(`${index + 1}. ${stem}`);
    question.options.forEach((option, optionIndex) => {
      lines.push(`${LETTERS[optionIndex] ?? optionIndex + 1}) ${option}`);
    });
    if (question.explanation) lines.push(`Explanation: ${question.explanation}`);
    lines.push('');
  });

  lines.push('## Answer Key', '');
  (exam.questions || []).forEach((question, index) => {
    const letter =
      question.correctAnswerIndex >= 0 && question.correctAnswerIndex < question.options.length
        ? LETTERS[question.correctAnswerIndex]
        : null;
    lines.push(`${index + 1}. ${letter ?? '—'}`);
  });
  lines.push('');

  return lines.join('\n');
}

/** Template offered in the import screen so the format is discoverable. */
export const EXAM_JSON_TEMPLATE = `{
  "schemaVersion": ${EXAM_SCHEMA_VERSION},
  "title": "My Practice Exam",
  "subject": "Physics",
  "grade": "Grade 12",
  "timeLimit": 3600,
  "questions": [
    {
      "id": "q1",
      "question": "What is the SI unit of force?",
      "options": ["Joule", "Newton", "Watt", "Pascal"],
      "correctAnswerIndex": 1,
      "explanation": "1 N = 1 kg\\u00b7m/s\\u00b2."
    },
    {
      "id": "q2",
      "question": "Which quantity is a vector?",
      "options": ["Speed", "Mass", "Velocity", "Time"],
      "correctAnswer": "C"
    }
  ]
}
`;

export function suggestTitleFromFileName(fileName: string): string {
  return slugifyTitle(fileName) || 'Imported Exam';
}
