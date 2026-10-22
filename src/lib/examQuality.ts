import type { Question } from '../services/geminiService';

export interface PreparedQuestions {
  questions: Question[];
  /** Questions that could not be shown at all (no stem, or fewer than 2 options). */
  dropped: number;
  /** Questions whose id or answer key had to be repaired. */
  repaired: number;
}

/**
 * Last line of defence before an exam reaches the student.
 *
 * Every parser (AI, heuristic, JSON, Markdown) tries to produce good questions,
 * but the exam view assumes a few invariants: unique non-empty ids, at least two
 * non-empty options, and an answer index that is either in range or -1. Broken
 * input there used to render an empty screen, duplicate React keys, or a
 * question that could never be answered. Everything is repaired in place; only
 * genuinely unusable entries are dropped, and the caller is told how many.
 */
export function prepareExamQuestions(input: unknown): PreparedQuestions {
  const list = Array.isArray(input) ? (input as Question[]) : [];
  const seenIds = new Set<string>();
  const questions: Question[] = [];
  let dropped = 0;
  let repaired = 0;

  list.forEach((raw, index) => {
    const stem = typeof raw?.question === 'string' ? raw.question.trim() : '';
    const options = Array.isArray(raw?.options)
      ? raw!.options
          .map((option) => (typeof option === 'string' ? option.trim() : ''))
          .filter((option) => option.length > 0)
      : [];

    if (!stem || options.length < 2) {
      dropped += 1;
      return;
    }

    let id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : '';
    if (!id || seenIds.has(id)) {
      // Duplicate or missing ids break React keys and answer lookups.
      let candidate = `q-${index + 1}`;
      let suffix = 2;
      while (seenIds.has(candidate)) candidate = `q-${index + 1}-${suffix++}`;
      id = candidate;
      repaired += 1;
    }
    seenIds.add(id);

    const rawIndex = raw.correctAnswerIndex;
    const isValidIndex =
      typeof rawIndex === 'number' &&
      Number.isInteger(rawIndex) &&
      rawIndex >= 0 &&
      rawIndex < options.length;
    if (!isValidIndex && rawIndex !== -1) repaired += 1;

    questions.push({
      ...raw,
      id,
      question: stem,
      options,
      // -1 keeps the question usable for practice but never scored.
      correctAnswerIndex: isValidIndex ? (rawIndex as number) : -1,
      explanation: typeof raw.explanation === 'string' ? raw.explanation.trim() : '',
    });
  });

  return { questions, dropped, repaired };
}
