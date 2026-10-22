/**
 * The snapshot that lets a refreshed page re-open the exam the student was
 * writing.
 *
 * Why this module exists: the restore used to trust whatever happened to be in
 * localStorage. A half-written, oversized or older-shaped snapshot would then
 * put the app into the exam screen with an empty question list — the dead end
 * that said "No questions found" with only a "back to dashboard" button. Every
 * read now goes through one strict validator, so a bad snapshot is treated as
 * "nothing to restore" and the app keeps the student somewhere useful.
 */

import type { Question } from '../services/geminiService';
import { ACTIVE_EXAM_STATE_KEY } from './examProgress';

export interface ActiveExamState {
  examQuestions: Question[];
  examTitle: string;
  selectedSubject: string;
  selectedGrade: string;
  currentExamId: string | null;
  currentSessionId: string | null;
  timeLimit: number | null;
  startTime: number;
  saveProgress: boolean;
}

/** A question is only usable if it can actually be rendered and answered. */
export function isUsableQuestion(value: unknown): value is Question {
  if (!value || typeof value !== 'object') return false;
  const question = value as Partial<Question>;
  if (typeof question.question !== 'string' || question.question.trim().length === 0) return false;
  if (!Array.isArray(question.options) || question.options.length < 2) return false;
  if (!question.options.every((option) => typeof option === 'string')) return false;
  return true;
}

/**
 * Keeps only the questions that survive a round-trip through localStorage
 * (JSON turns `undefined` array entries into `null`, which used to leave
 * `questions[0]` null and blank the whole screen).
 */
export function sanitizeQuestions(value: unknown): Question[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isUsableQuestion);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function asOptionalId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Parses a raw snapshot. Returns `null` whenever the snapshot cannot produce a
 * genuinely playable exam, so callers never enter the exam screen empty.
 */
export function parseActiveExamState(raw: string | null | undefined): ActiveExamState | null {
  if (!raw) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const examQuestions = sanitizeQuestions(parsed.examQuestions);
  if (examQuestions.length === 0) return null;

  const startTime = asNumber(parsed.startTime);
  if (startTime === null) return null;

  return {
    examQuestions,
    examTitle: asString(parsed.examTitle, 'Exam'),
    selectedSubject: asString(parsed.selectedSubject, 'General'),
    selectedGrade: asString(parsed.selectedGrade, 'General'),
    currentExamId: asOptionalId(parsed.currentExamId),
    currentSessionId: asOptionalId(parsed.currentSessionId),
    timeLimit: asNumber(parsed.timeLimit),
    startTime,
    saveProgress: parsed.saveProgress === true,
  };
}

/** Reads and validates the snapshot in one step. */
export function readActiveExamState(storage: Storage | null | undefined): ActiveExamState | null {
  if (!storage) return null;
  try {
    return parseActiveExamState(storage.getItem(ACTIVE_EXAM_STATE_KEY));
  } catch {
    // Storage can be unavailable (private mode, sandboxed frame).
    return null;
  }
}

/** True when the value can be stored safely without eating the quota. */
export function fitsInStorage(value: unknown, maxBytes = 2_000_000): boolean {
  try {
    return JSON.stringify(value).length <= maxBytes;
  } catch {
    return false;
  }
}
