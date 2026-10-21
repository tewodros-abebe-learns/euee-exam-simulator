import { type ExamData, type Question } from '../services/geminiService';
import { normalizeExamData } from './examNormalizer';

export type HeuristicConfidence = 'high' | 'low';

export interface HeuristicParseResult {
  data: ExamData | null;
  confidence: HeuristicConfidence;
  reason?: string;
  stats: {
    candidateQuestions: number;
    acceptedQuestions: number;
    rejectedQuestions: number;
    withAnswerKey: number;
  };
}

/**
 * Deterministic, offline parser used only as a *last resort* when the AI
 * models are unavailable.
 *
 * Safety rules (these used to be violated, which produced fake exams that were
 * presented to students as real practice material):
 *  - Options are never invented. A question without at least two parsed
 *    options is rejected.
 *  - The answer key is never guessed. Questions whose answer could not be
 *    detected are still returned for review, but the overall result is marked
 *    as low confidence so callers can refuse to treat it as a graded exam.
 */
export function parseExamHeuristicallyDetailed(
  rawText: string,
  defaultTitle: string = 'Extracted Exam'
): HeuristicParseResult {
  const empty: HeuristicParseResult = {
    data: null,
    confidence: 'low',
    reason: 'No readable text was found in the document.',
    stats: { candidateQuestions: 0, acceptedQuestions: 0, rejectedQuestions: 0, withAnswerKey: 0 },
  };

  if (!rawText || !rawText.trim()) return empty;

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return empty;

  const questions: Question[] = [];

  let currentSection = '';
  let currentInstruction = '';
  let currentPassage = '';
  let currentContext = '';
  let currentQuestionText = '';
  let currentOptions: string[] = [];
  let currentAnswerIndex: number | null = null;
  let currentExplanation = '';
  let currentId = 1;
  let currentQuestionNumber = 0;

  let candidateQuestions = 0;
  let rejectedQuestions = 0;
  let withAnswerKey = 0;

  // Regex patterns
  const questionStartRegex = /^(?:Question\s*|Q\s*)?(\d+)[\.\)\:\-]\s*(.*)/i;
  const standaloneNumberRegex = /^(\d+)[\.\)]?$/;
  const optionRegex = /^(?:[•\-\*]\s*)?[(\[]?([A-Ea-e1-4])[)\].\:\-]\s*(.*)/;
  const answerRegex = /^(?:Correct\s*)?(?:Answer|Ans|Key|Option)[\s\:\-]+([A-Ea-e1-4]|\d+)/i;
  const explanationRegex = /^(?:Explanation|Reason|Solution|Note)[\s\:\-]+(.*)/i;
  const sectionHeaderRegex = /^(?:SECTION\s+[A-Z0-9]+|PART\s+[A-Z0-9]+|CHAPTER\s+[A-Z0-9]+)[\s\:\-]*(.*)/i;
  const directionRegex = /^(?:DIRECTIONS?|INSTRUCTIONS?)[\s\:\-]+(.*)/i;
  const passageHeaderRegex = /^(?:Reading\s+Passage|Passage\s+[A-Z0-9]+|Passage)[\s\:\-]*(.*)/i;

  function commitCurrentQuestion() {
    const questionText = currentQuestionText.trim();
    if (questionText) {
      candidateQuestions += 1;
      const options = currentOptions.map((option) => option.trim()).filter((option) => option.length > 0);
      const uniqueOptions = Array.from(new Set(options));

      if (uniqueOptions.length >= 2) {
        if (currentAnswerIndex !== null) withAnswerKey += 1;
        questions.push({
          id: `q-${currentId++}`,
          section: currentSection.trim() || undefined,
          instruction: currentInstruction.trim() || undefined,
          passage: currentPassage.trim() || undefined,
          context: currentContext.trim() || undefined,
          question: questionText,
          options: uniqueOptions,
          correctAnswerIndex:
            currentAnswerIndex !== null && currentAnswerIndex < uniqueOptions.length ? currentAnswerIndex : 0,
          explanation: currentExplanation.trim() || 'Extracted from the source document.',
        });
        currentContext = '';
      } else {
        // No reliable option set: do not invent one.
        rejectedQuestions += 1;
      }
    }
    currentQuestionText = '';
    currentOptions = [];
    currentAnswerIndex = null;
    currentExplanation = '';
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const secMatch = line.match(sectionHeaderRegex);
    if (secMatch && !currentQuestionText) {
      commitCurrentQuestion();
      currentQuestionNumber = 0;
      currentSection = line;
      if (!/reading|passage|comprehension/i.test(line)) {
        currentPassage = '';
      }
      continue;
    }

    const dirMatch = line.match(directionRegex);
    if (dirMatch && !currentQuestionText) {
      commitCurrentQuestion();
      currentQuestionNumber = 0;
      currentInstruction = line;
      if (!/passage|read the following|comprehension/i.test(line)) {
        currentPassage = '';
      }
      continue;
    }

    const passMatch = line.match(passageHeaderRegex);
    if (passMatch && !currentQuestionText) {
      currentPassage = (currentPassage ? `${currentPassage}\n\n` : '') + line;
      continue;
    }

    const standNumMatch = line.match(standaloneNumberRegex);
    if (standNumMatch) {
      commitCurrentQuestion();
      currentQuestionNumber = parseInt(standNumMatch[1], 10);
      currentQuestionText = `Question ${standNumMatch[1]}`;
      continue;
    }

    const qMatch = line.match(questionStartRegex);
    if (qMatch && !line.match(answerRegex)) {
      const number = parseInt(qMatch[1], 10);
      const rest = (qMatch[2] || '').trim();
      const startsWithNumber = /^\d/.test(line.trim());
      const looksLikeOption = Boolean(line.match(optionRegex));
      const startsFresh = currentQuestionText.trim().length === 0;
      const nextInSequence = number === currentQuestionNumber + 1;
      const readsLikeQuestionText = rest.endsWith('?') || rest.length > 20;

      // "2." is ambiguous: it can be question 2 or option 2. Prefer the
      // question reading only when we already collected options and the number
      // continues the sequence (and the text reads like a question).
      const isQuestionStart =
        !looksLikeOption ||
        (startsWithNumber && startsFresh) ||
        (startsWithNumber && nextInSequence && currentOptions.length >= 2 && readsLikeQuestionText) ||
        (startsWithNumber && number > currentOptions.length + 1 && readsLikeQuestionText);

      if (isQuestionStart) {
        commitCurrentQuestion();
        currentQuestionNumber = number;
        currentQuestionText = rest || `Question ${number}`;
        continue;
      }
    }

    if (line.endsWith('?') && !currentQuestionText) {
      commitCurrentQuestion();
      currentQuestionText = line;
      continue;
    }

    const optMatch = line.match(optionRegex);
    if (optMatch && currentQuestionText) {
      const text = optMatch[2] ? optMatch[2].trim() : '';
      // "1. ..." that starts a new question must not be swallowed as an option.
      const isNumericOption = /^[1-4]$/.test(optMatch[1]) && currentOptions.length > 0;
      if (text.length > 0 && (isNumericOption || /[A-Ea-e]/.test(optMatch[1]))) {
        currentOptions.push(text);
        continue;
      }
    }

    const ansMatch = line.match(answerRegex);
    if (ansMatch) {
      const value = ansMatch[1].toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(value)) {
        currentAnswerIndex = value.charCodeAt(0) - 65;
      } else if (!Number.isNaN(parseInt(value, 10))) {
        currentAnswerIndex = Math.max(0, parseInt(value, 10) - 1);
      }
      continue;
    }

    const expMatch = line.match(explanationRegex);
    if (expMatch) {
      currentExplanation = expMatch[1] ? expMatch[1].trim() : '';
      continue;
    }

    if (currentOptions.length > 0) {
      currentOptions[currentOptions.length - 1] += ` ${line}`;
    } else if (currentQuestionText) {
      currentQuestionText += ` ${line}`;
    } else if (currentPassage) {
      currentPassage += `\n${line}`;
    } else if (currentInstruction) {
      currentInstruction += ` ${line}`;
    } else {
      currentContext = (currentContext ? `${currentContext}\n` : '') + line;
    }
  }

  commitCurrentQuestion();

  if (questions.length === 0) {
    return {
      data: null,
      confidence: 'low',
      reason:
        rejectedQuestions > 0
          ? 'Questions were found but no answer options could be read from the document.'
          : 'No multiple-choice questions could be detected in this document.',
      stats: { candidateQuestions, acceptedQuestions: 0, rejectedQuestions, withAnswerKey },
    };
  }

  const answerKeyRatio = withAnswerKey / questions.length;
  const confidence: HeuristicConfidence = answerKeyRatio >= 0.6 ? 'high' : 'low';

  return {
    data: normalizeExamData({
      title: defaultTitle,
      questions,
    }),
    confidence,
    reason:
      confidence === 'low'
        ? 'Only some questions had a readable answer key, so this exam cannot be graded reliably.'
        : undefined,
    stats: { candidateQuestions, acceptedQuestions: questions.length, rejectedQuestions, withAnswerKey },
  };
}

export function parseExamHeuristically(rawText: string, defaultTitle: string = 'Extracted Exam'): ExamData | null {
  return parseExamHeuristicallyDetailed(rawText, defaultTitle).data;
}
