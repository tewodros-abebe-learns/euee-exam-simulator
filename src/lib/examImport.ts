import { parseExamHeuristicallyDetailed } from './heuristicExamParser';
import { isCsvExam, parseExamCsv } from './csvImport';
import {
  EXAM_SCHEMA_VERSION,
  UNGRADED_ANSWER_INDEX,
  parseExamJson,
  type ImportDefaults,
  type ImportIssue,
  type ImportReport,
  type ImportedExam,
} from './examSchema';

/**
 * Deterministic import pipeline.
 *
 * Everything here runs on the device: no network call, no API key, no quota —
 * so importing a file can never invent a question, an option or an answer.
 * The AI path stays a separate, explicit choice in the UI.
 */

const LETTERS = 'ABCDEFGHIJ';

/** AI chat output often arrives wrapped in a ```json … ``` fence. */
export function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?```\s*$/.exec(trimmed);
  return fenced ? fenced[1].trim() : trimmed;
}

export function detectFormat(raw: string): 'json' | 'markdown' | 'csv' {
  const stripped = stripCodeFence(raw).trim();
  if (!stripped) return 'markdown';
  if (stripped.startsWith('{') || stripped.startsWith('[')) return 'json';
  // A spreadsheet export is recognised by its header row, not by its
  // extension (pasted CSV has no file name at all).
  if (isCsvExam(stripped)) return 'csv';
  return 'markdown';
}

interface AnswerKeySection {
  body: string;
  answers: Map<number, string>;
  found: boolean;
}

/**
 * Pulls a trailing "## Answer Key" style section out of the document and maps
 * `1. B` / `2-C` / `Q3: D` pairs to question numbers.
 */
export function extractMarkdownAnswerKey(raw: string): AnswerKeySection {
  const lines = raw.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) =>
    /^#{0,6}\s*(answer\s*(key|sheet|grid)|answers?|key)\s*:?\s*$/i.test(line.trim())
  );

  if (headingIndex === -1) {
    // Some documents end with "Answers: 1. B 2. C …" on a single line.
    const inline = /^\s*(?:answers?|answer\s*key)\s*[:\-]\s*(.+)$/im.exec(raw);
    if (inline) {
      const answers = parseAnswerPairs(inline[1]);
      if (answers.size > 0) {
        return { body: raw.replace(inline[0], ''), answers, found: true };
      }
    }
    return { body: raw, answers: new Map(), found: false };
  }

  const body = lines.slice(0, headingIndex).join('\n');
  const answers = parseAnswerPairs(lines.slice(headingIndex + 1).join('\n'));
  return { body, answers, found: answers.size > 0 };
}

function parseAnswerPairs(text: string): Map<number, string> {
  const answers = new Map<number, string>();
  const pairRegex = /(?:^|[\s,;|])(?:Q(?:uestion)?\s*)?(\d{1,3})\s*[.)\]:=-]\s*([A-J])(?![A-Za-z0-9])/g;
  let match: RegExpExecArray | null;
  while ((match = pairRegex.exec(text)) !== null) {
    const number = parseInt(match[1], 10);
    if (number > 0) answers.set(number, match[2].toUpperCase());
  }
  return answers;
}

interface MarkdownMeta {
  title?: string;
  subject?: string;
  grade?: string;
  timeLimit?: number;
}

function parseMarkdownMeta(raw: string): MarkdownMeta {
  const meta: MarkdownMeta = {};
  const lines = raw.split(/\r?\n/).slice(0, 25);

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = /^#{1,2}\s+(.+)$/.exec(trimmed);
    if (heading && !meta.title) {
      meta.title = heading[1].trim();
      continue;
    }
    const pair = /^([a-zA-Z][a-zA-Z ]{1,20})\s*:\s*(.+)$/.exec(trimmed);
    if (!pair) continue;
    const key = pair[1].toLowerCase().replace(/\s+/g, '');
    const value = pair[2].trim();
    if (key === 'subject' && !meta.subject) meta.subject = value;
    if (key === 'grade' && !meta.grade) meta.grade = value;
    if (key === 'title' && !meta.title) meta.title = value;
    if ((key === 'timelimit' || key === 'duration' || key === 'time') && !meta.timeLimit) {
      const seconds = parseDurationToSeconds(value);
      if (seconds) meta.timeLimit = seconds;
    }
  }

  return meta;
}

function parseDurationToSeconds(value: string): number | undefined {
  const hours = /(\d+)\s*(?:h|hr|hour)/i.exec(value);
  const minutes = /(\d+)\s*(?:m|min|minute)/i.exec(value);
  let total = 0;
  if (hours) total += parseInt(hours[1], 10) * 3600;
  if (minutes) total += parseInt(minutes[1], 10) * 60;
  if (total > 0) return total;
  const bare = /^(\d+)$/.exec(value.trim());
  return bare ? parseInt(bare[1], 10) * 60 : undefined;
}

export function parseExamMarkdown(raw: string, defaults: ImportDefaults = {}): ImportReport {
  const issues: ImportIssue[] = [];
  const stats = { total: 0, accepted: 0, rejected: 0, graded: 0, ungraded: 0 };

  const fail = (message: string): ImportReport => {
    issues.push({ level: 'error', message });
    return { ok: false, exam: null, issues, stats, format: 'markdown' };
  };

  if (!raw || !raw.trim()) return fail('The file is empty.');

  const { body, answers, found: keySectionFound } = extractMarkdownAnswerKey(raw);
  const meta = parseMarkdownMeta(body);

  const parsed = parseExamHeuristicallyDetailed(body, meta.title || defaults.title || 'Imported Exam', {
    keepUnknownAnswers: true,
  });

  stats.total = Math.max(parsed.stats.candidateQuestions, parsed.stats.acceptedQuestions);
  stats.rejected = parsed.stats.rejectedQuestions;

  if (!parsed.data || parsed.data.questions.length === 0) {
    return fail(
      parsed.reason ||
        'No multiple-choice questions were detected. Each question needs a stem of at least two lines of "A) …" options, plus an answer key.'
    );
  }

  const questions = parsed.data.questions.map((question) => ({ ...question }));

  // Apply the trailing answer-key section by question position.
  if (answers.size > 0) {
    questions.forEach((question, index) => {
      const letter = answers.get(index + 1);
      if (!letter) return;
      const optionIndex = LETTERS.indexOf(letter);
      if (optionIndex >= 0 && optionIndex < question.options.length) {
        question.correctAnswerIndex = optionIndex;
      } else {
        issues.push({
          level: 'warning',
          message: `The answer key says "${letter}" but this question only has ${question.options.length} options.`,
          questionNumber: index + 1,
        });
      }
    });

    if (answers.size > questions.length) {
      issues.push({
        level: 'warning',
        message: `The answer key has ${answers.size} entries but only ${questions.length} questions were read.`,
      });
    }
  }

  questions.forEach((question, index) => {
    if (question.correctAnswerIndex < 0 || question.correctAnswerIndex >= question.options.length) {
      question.correctAnswerIndex = UNGRADED_ANSWER_INDEX;
      issues.push({
        level: 'warning',
        message: 'No answer key for this question — it will be imported but never scored.',
        questionNumber: index + 1,
      });
    }
  });

  if (!keySectionFound && questions.every((q) => q.correctAnswerIndex < 0)) {
    issues.push({
      level: 'warning',
      message:
        'No answer key was found. The exam will open in practice mode (nothing is scored). Add an "## Answer Key" section to grade it.',
    });
  }

  const graded = questions.filter((q) => q.correctAnswerIndex >= 0).length;
  stats.accepted = questions.length;
  stats.graded = graded;
  stats.ungraded = questions.length - graded;

  const exam: ImportedExam = {
    schemaVersion: EXAM_SCHEMA_VERSION,
    title: meta.title || defaults.title || 'Imported Exam',
    subject: meta.subject || defaults.subject || 'General',
    grade: meta.grade || defaults.grade || 'Grade 12',
    ...(meta.timeLimit ? { timeLimit: meta.timeLimit } : {}),
    questions,
  };

  return { ok: true, exam, issues, stats, format: 'markdown' };
}

/** Auto-detects JSON vs Markdown and imports accordingly. */
export function parseExamText(raw: string, defaults: ImportDefaults = {}): ImportReport {
  const cleaned = stripCodeFence(raw);
  if (!cleaned.trim()) {
    return {
      ok: false,
      exam: null,
      issues: [{ level: 'error', message: 'The file is empty.' }],
      stats: { total: 0, accepted: 0, rejected: 0, graded: 0, ungraded: 0 },
      format: 'markdown',
    };
  }

  switch (detectFormat(cleaned)) {
    case 'json':
      return parseExamJson(cleaned, defaults);
    case 'csv':
      return parseExamCsv(cleaned, defaults);
    default:
      return parseExamMarkdown(cleaned, defaults);
  }
}
