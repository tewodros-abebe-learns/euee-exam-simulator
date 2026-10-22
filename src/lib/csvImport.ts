import {
  EXAM_SCHEMA_VERSION,
  UNGRADED_ANSWER_INDEX,
  type ImportDefaults,
  type ImportIssue,
  type ImportReport,
  type ImportedExam,
} from './examSchema';
import type { Question } from '../services/geminiService';

/**
 * Deterministic CSV import.
 *
 * CSV is the format a teacher is most likely to already have (a spreadsheet
 * export), so it must work on the device like JSON and Markdown do — no API
 * key, no quota, and no guessing an answer key. The reader is a real
 * RFC-4180-style parser: quoted fields, doubled quotes, embedded commas and
 * newlines, CRLF, a UTF-8 BOM, and comma / semicolon / tab delimiters.
 *
 * Recognised headers (case, spaces, underscores and dashes are ignored):
 *   question | stem | prompt | text
 *   option_a … option_j   (or choice_a …, a … j, option1 … option10)
 *   options                (one cell, separated by `|` or `;`)
 *   correct_answer | answer | key | correct (a letter, a number, or the option text)
 *   explanation | reason | solution | rationale
 *   optional: section, passage, instruction, context, id
 */

const LETTERS = 'ABCDEFGHIJ';
const MAX_ROWS = 1000;

export type CsvCell = string;

/** Splits one CSV document into rows of cells. Quotes are handled properly. */
export function parseDelimited(text: string, delimiter: string): CsvCell[][] {
  const rows: CsvCell[][] = [];
  let row: CsvCell[] = [];
  let cell = '';
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell.trim() === '') {
      // A quote only opens a quoted field at the start of a cell.
      inQuotes = true;
      cell = '';
      continue;
    }
    if (char === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (char === '\r') continue;

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  // Drop trailing fully-empty rows (a file usually ends with a newline).
  return rows.filter((entry) => entry.some((value) => value.trim() !== ''));
}

/** Picks the delimiter that gives the header row the most columns. */
export function detectDelimiter(text: string): string {
  const sample = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '').slice(0, 5);
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = sample.reduce((total, line) => total + (line.split(candidate).length - 1), 0);
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

const normalizeKey = (value: string): string => value.toLowerCase().replace(/[\s_\-.]/g, '').trim();

const QUESTION_KEYS = ['question', 'questions', 'stem', 'prompt', 'questiontext', 'text', 'item', 'q'];
const OPTION_LIST_KEYS = ['options', 'choices', 'alternatives', 'answeroptions', 'optionlist'];
const ANSWER_KEYS = [
  'correctanswer',
  'correctanswerletter',
  'answer',
  'answerkey',
  'answers',
  'correct',
  'correctoption',
  'correctletter',
  'key',
  'answerletter',
];
const EXPLANATION_KEYS = ['explanation', 'reason', 'solution', 'rationale', 'note', 'notes', 'why'];
const SECTION_KEYS = ['section', 'topic', 'unit', 'chapter'];
const PASSAGE_KEYS = ['passage', 'readingpassage', 'textpassage'];
const INSTRUCTION_KEYS = ['instruction', 'instructions', 'direction', 'directions'];
const CONTEXT_KEYS = ['context'];

const optionColumnIndex = (key: string): number | null => {
  const match =
    /^option([a-j])$/.exec(key) ||
    /^choice([a-j])$/.exec(key) ||
    /^option(\d{1,2})$/.exec(key) ||
    /^([a-j])$/.exec(key);
  if (!match) return null;
  const token = match[1];
  if (/^\d+$/.test(token)) {
    const position = parseInt(token, 10) - 1;
    return position >= 0 && position <= 9 ? position : null;
  }
  return LETTERS.indexOf(token.toUpperCase());
};

/** True when the first row looks like the header of an exam spreadsheet. */
export function isCsvExam(text: string): boolean {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) return false;
  const firstLine = trimmed.split(/\r?\n/)[0];
  if (!/[,\t;]/.test(firstLine)) return false;
  const delimiter = detectDelimiter(trimmed);
  const cells = parseDelimited(firstLine, delimiter)[0] || [];
  const keys = cells.map(normalizeKey);
  const hasQuestion = keys.some((key) => QUESTION_KEYS.includes(key));
  const hasOptions = keys.some((key) => optionColumnIndex(key) !== null || OPTION_LIST_KEYS.includes(key));
  const hasAnswer = keys.some((key) => ANSWER_KEYS.includes(key));
  return hasQuestion && (hasOptions || hasAnswer);
}

interface CsvLayout {
  question: number;
  optionList: number | null;
  /** Option columns in A, B, C… order. */
  optionColumns: { position: number; column: number }[];
  answer: number | null;
  explanation: number | null;
  section: number | null;
  passage: number | null;
  instruction: number | null;
  context: number | null;
  id: number | null;
}

function findLayout(header: string[]): CsvLayout | null {
  const keys = header.map(normalizeKey);
  const find = (candidates: string[]) => keys.findIndex((key) => candidates.includes(key));

  const question = find(QUESTION_KEYS);
  if (question === -1) return null;

  const optionColumns: { position: number; column: number }[] = [];
  keys.forEach((key, column) => {
    const position = optionColumnIndex(key);
    if (position !== null && !optionColumns.some((entry) => entry.position === position)) {
      optionColumns.push({ position, column });
    }
  });
  optionColumns.sort((a, b) => a.position - b.position);

  const optionList = find(OPTION_LIST_KEYS);
  const answer = find(ANSWER_KEYS);
  if (optionColumns.length === 0 && optionList === -1) return null;

  return {
    question,
    optionList: optionList === -1 ? null : optionList,
    optionColumns,
    answer: answer === -1 ? null : answer,
    explanation: find(EXPLANATION_KEYS) === -1 ? null : find(EXPLANATION_KEYS),
    section: find(SECTION_KEYS) === -1 ? null : find(SECTION_KEYS),
    passage: find(PASSAGE_KEYS) === -1 ? null : find(PASSAGE_KEYS),
    instruction: find(INSTRUCTION_KEYS) === -1 ? null : find(INSTRUCTION_KEYS),
    context: find(CONTEXT_KEYS) === -1 ? null : find(CONTEXT_KEYS),
    id: find(['id', 'questionid']) === -1 ? null : find(['id', 'questionid']),
  };
}

/** Removes a leading "A)" / "B." / "- " marker from an option's text. */
const cleanOption = (value: string): string =>
  value
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/^\s*[([-]?[A-Ja-j][)\].:]\s+/, '')
    .trim();

const normalizeForMatch = (value: string): string =>
  cleanOption(value).toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Resolves a CSV answer cell to a zero-based option position.
 * Returns `UNGRADED_ANSWER_INDEX` when the cell does not state an answer.
 */
export function resolveCsvAnswer(raw: string, options: string[]): number {
  const value = (raw || '').trim();
  if (!value) return UNGRADED_ANSWER_INDEX;

  const letter = /^[([]?([A-Ja-j])[)\].:]?$/.exec(value);
  if (letter) {
    const position = LETTERS.indexOf(letter[1].toUpperCase());
    return position >= 0 && position < options.length ? position : UNGRADED_ANSWER_INDEX;
  }

  const match = options.findIndex((option) => normalizeForMatch(option) === normalizeForMatch(value));

  if (/^\d{1,3}$/.test(value)) {
    const numeric = parseInt(value, 10);
    // 1-based, except that 0 means the first option.
    const position = numeric === 0 ? 0 : numeric - 1;
    if (position >= 0 && position < options.length) return position;
    // The number is out of range as an index, so it is probably an option's
    // text (a maths answer such as "8"), which was matched above.
    return match;
  }

  return match;
}

const splitOptionList = (value: string): string[] =>
  value
    .split(/\s*[|;\n]\s*/)
    .map((option) => cleanOption(option))
    .filter((option) => option.length > 0);

export function parseExamCsv(raw: string, defaults: ImportDefaults = {}): ImportReport {
  const issues: ImportIssue[] = [];
  const stats = { total: 0, accepted: 0, rejected: 0, graded: 0, ungraded: 0 };

  const fail = (message: string): ImportReport => {
    issues.push({ level: 'error', message });
    return { ok: false, exam: null, issues, stats, format: 'csv' };
  };

  if (!raw || !raw.trim()) return fail('The file is empty.');

  const delimiter = detectDelimiter(raw);
  const rows = parseDelimited(raw, delimiter);
  if (rows.length < 2) {
    return fail('A CSV exam needs a header row and at least one question row.');
  }

  const layout = findLayout(rows[0]);
  if (!layout) {
    return fail(
      'This CSV has no recognisable header. The first row needs at least a "question" column and options (option_a, option_b, … or an "options" column).'
    );
  }

  const questions: Question[] = [];
  const usedIds = new Set<string>();
  const seenStems = new Map<string, number>();

  rows.slice(1).forEach((row, rowIndex) => {
    if (questions.length >= MAX_ROWS) return;
    const number = rowIndex + 1;

    const cell = (column: number | null): string => (column === null ? '' : (row[column] || '').trim());

    const text = cell(layout.question);
    stats.total += 1;

    if (!text) {
      // A blank line inside the sheet is not a question.
      if (row.some((value) => value.trim() !== '')) {
        stats.rejected += 1;
        issues.push({ level: 'error', message: 'Question text is missing.', questionNumber: number });
      }
      return;
    }

    // Options arrive either as one delimited cell or as option_a…option_j columns.
    const rawOptions: { position: number; text: string }[] = [];
    if (layout.optionList !== null && splitOptionList(cell(layout.optionList)).length >= 2) {
      splitOptionList(cell(layout.optionList)).forEach((option, position) =>
        rawOptions.push({ position, text: option })
      );
    } else {
      layout.optionColumns.forEach(({ position, column }) => {
        rawOptions.push({ position, text: cleanOption(cell(column)) });
      });
    }

    // Empty option cells are dropped, but the answer letter still refers to the
    // column it was written in (a spreadsheet often has an unused option_e).
    const kept = rawOptions.filter((option) => option.text.length > 0);
    const options = kept.map((option) => option.text);

    if (options.length < 2) {
      stats.rejected += 1;
      issues.push({
        level: 'error',
        message: `Only ${options.length} option(s) found; at least 2 are required.`,
        questionNumber: number,
      });
      return;
    }

    let answerIndex = UNGRADED_ANSWER_INDEX;
    const answerCell = cell(layout.answer);
    if (answerCell) {
      // Resolve against the raw column positions, then map back to the kept list.
      const rawPosition = resolveCsvAnswer(answerCell, rawOptions.map((option) => option.text));
      if (rawPosition >= 0) {
        answerIndex = kept.findIndex((option) => option.position === rawPosition);
      }
      if (answerIndex < 0 || answerIndex >= options.length) {
        issues.push({
          level: 'warning',
          message: `The answer "${answerCell}" does not match any option of this question.`,
          questionNumber: number,
        });
        answerIndex = UNGRADED_ANSWER_INDEX;
      }
    }

    const duplicate = options.find(
      (option, index) =>
        normalizeForMatch(option) &&
        options.findIndex((other) => normalizeForMatch(other) === normalizeForMatch(option)) !== index
    );
    if (duplicate) {
      issues.push({
        level: 'warning',
        message: `Repeated option text: "${duplicate.slice(0, 60)}".`,
        questionNumber: number,
      });
    }

    const stemKey = normalizeForMatch(text);
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

    const explicitId = cell(layout.id);
    let id = explicitId || `q-${number}`;
    if (usedIds.has(id)) id = `${id}-${number}`;
    usedIds.add(id);

    const section = cell(layout.section);
    const passage = cell(layout.passage);
    const instruction = cell(layout.instruction);
    const context = cell(layout.context);

    questions.push({
      id,
      question: text,
      options,
      correctAnswerIndex: answerIndex,
      explanation: cell(layout.explanation),
      ...(section ? { section } : {}),
      ...(passage ? { passage } : {}),
      ...(instruction ? { instruction } : {}),
      ...(context ? { context } : {}),
    });

    stats.accepted += 1;
    if (answerIndex >= 0) stats.graded += 1;
    else stats.ungraded += 1;
  });

  if (questions.length === 0) {
    return fail('No questions could be read from this CSV. Check that every row has a question and at least two options.');
  }

  const exam: ImportedExam = {
    schemaVersion: EXAM_SCHEMA_VERSION,
    title: defaults.title || 'Imported Exam',
    subject: defaults.subject || 'General',
    grade: defaults.grade || 'Grade 12',
    questions,
  };

  if (stats.ungraded === questions.length) {
    issues.push({
      level: 'warning',
      message:
        'No answer key was found. The exam will open in practice mode (nothing is scored). Add a "correct_answer" column to grade it.',
    });
  }

  return { ok: true, exam, issues, stats, format: 'csv' };
}
