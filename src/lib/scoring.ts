import type { Question } from '../services/geminiService';

export interface GradeSummary {
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  skipped: number;
  percentage: number;
}

/**
 * Returns the correct option text for a question, or undefined when the
 * question has no usable answer key.
 */
export function getCorrectAnswer(question: Question | undefined | null): string | undefined {
  if (!question || !Array.isArray(question.options) || question.options.length === 0) {
    return undefined;
  }
  const index = question.correctAnswerIndex;
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= question.options.length) {
    return undefined;
  }
  return question.options[index];
}

/**
 * Answers are stored as the selected option *text*, so grading must compare
 * text (never parseInt / letter indexes).
 */
export function isAnswerCorrect(question: Question, answer: string | undefined | null): boolean {
  const correct = getCorrectAnswer(question);
  return typeof answer === 'string' && answer.length > 0 && correct !== undefined && answer === correct;
}

export function gradeExam(
  questions: Question[],
  answers: Record<string, string> = {}
): GradeSummary {
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;

  (questions || []).forEach((question) => {
    const answer = answers?.[question.id];
    if (!answer) {
      skipped += 1;
    } else if (isAnswerCorrect(question, answer)) {
      correct += 1;
    } else {
      incorrect += 1;
    }
  });

  const total = questions?.length || 0;
  return {
    total,
    answered: correct + incorrect,
    correct,
    incorrect,
    skipped,
    percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}

export type AnswerStatus = 'correct' | 'incorrect' | 'skipped';

export function getAnswerStatus(
  question: Question,
  answers: Record<string, string> = {}
): AnswerStatus {
  const answer = answers?.[question.id];
  if (!answer) return 'skipped';
  return isAnswerCorrect(question, answer) ? 'correct' : 'incorrect';
}

/** A quick structural sanity check used for AI/heuristic output. */
export function isValidQuestion(question: unknown): question is Question {
  if (!question || typeof question !== 'object') return false;
  const q = question as Question;
  return Boolean(
    typeof q.id === 'string' &&
      q.id.trim().length > 0 &&
      typeof q.question === 'string' &&
      q.question.trim().length > 0 &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.every((option) => typeof option === 'string' && option.trim().length > 0) &&
      typeof q.correctAnswerIndex === 'number' &&
      Number.isInteger(q.correctAnswerIndex) &&
      q.correctAnswerIndex >= 0 &&
      q.correctAnswerIndex < q.options.length
  );
}

export function filterValidQuestions(questions: unknown): Question[] {
  if (!Array.isArray(questions)) return [];
  return questions.filter(isValidQuestion);
}
