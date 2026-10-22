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

    // Empty options are removed, but the answer key is an INDEX: deleting an
    // option shifts everything after it. The kept entries therefore remember
    // where they came from, and the key is re-pointed (or dropped) using that
    // map. Without this, ["A", "", "C"] with key 1 would silently grade the
    // wrong option as correct.
    const rawOptions = Array.isArray(raw?.options) ? raw!.options : [];
    const keptIndices: number[] = [];
    const options: string[] = [];
    rawOptions.forEach((option, optionIndex) => {
      const text = typeof option === 'string' ? option.trim() : '';
      if (!text) return;
      options.push(text);
      keptIndices.push(optionIndex);
    });

    /** Where the original option index ended up, or -1 when it was dropped. */
    const remapIndex = (original: number): number => keptIndices.indexOf(original);

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
    const hasIndex = typeof rawIndex === 'number' && Number.isInteger(rawIndex) && rawIndex >= 0;
    const originalAnswerText = hasIndex ? rawOptions[rawIndex as number] : undefined;
    const isUsableKey =
      hasIndex &&
      typeof originalAnswerText === 'string' &&
      originalAnswerText.trim().length > 0;
    const remapped = isUsableKey ? remapIndex(rawIndex as number) : -1;

    if (remapped === -1 && rawIndex !== -1) repaired += 1;

    questions.push({
      ...raw,
      id,
      question: stem,
      options,
      // -1 keeps the question usable for practice but never scored.
      correctAnswerIndex: remapped,
      explanation: typeof raw.explanation === 'string' ? raw.explanation.trim() : '',
    });
  });

  return { questions, dropped, repaired };
}
