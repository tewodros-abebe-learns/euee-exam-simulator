import { parseExamHeuristicallyDetailed } from '../lib/heuristicExamParser';
import { normalizeExamData } from '../lib/examNormalizer';

export interface Question {
  id: string;
  section?: string;
  instruction?: string;
  passage?: string;
  context?: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface ExamData {
  title: string;
  questions: Question[];
  /** Present when the exam came from the on-device parser. */
  source?: 'ai' | 'heuristic';
  /** Human-readable caveat shown to the student (e.g. AI unavailable). */
  warning?: string;
}

export interface GenerateExamOptions {
  rawText?: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
  titleHint?: string;
}

const REQUEST_TIMEOUT_MS = 180_000;

/**
 * Calls the server-side AI extractor.
 *
 * Unlike the previous implementation this never silently swaps in a
 * heuristic (and possibly fabricated) exam when the server returns an error —
 * errors are surfaced to the user. The deterministic parser is only used when
 * the network request itself fails *and* it is confident it read both the
 * options and the answer key.
 */
export async function generateExamFromDocument(options: GenerateExamOptions): Promise<ExamData> {
  const { rawText, fileBase64, mimeType, fileName, titleHint } = options;

  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    response = await fetch('/api/generate-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        rawText: rawText || '',
        fileBase64,
        mimeType,
        fileName,
      }),
    });
  } catch (networkError: any) {
    const local = localFallback(rawText, titleHint || fileName);
    if (local) return local;
    throw new Error(
      networkError?.name === 'AbortError'
        ? 'The AI request timed out. Please try again with a smaller document.'
        : 'Could not reach the exam service. Check your internet connection and try again.'
    );
  } finally {
    window.clearTimeout(timeout);
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `The exam service returned an error (${response.status}). Please try again in a moment.`
    );
  }

  if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('No valid questions could be extracted from this document.');
  }

  return normalizeExamData({
    ...data,
    source: data.source === 'heuristic' ? 'heuristic' : 'ai',
  }) as ExamData;
}

function localFallback(rawText?: string, title?: string): ExamData | null {
  if (!rawText || rawText.trim().length < 40) return null;
  const parsed = parseExamHeuristicallyDetailed(rawText, title || 'Uploaded Exam Practice');
  if (!parsed.data || parsed.confidence !== 'high' || parsed.data.questions.length === 0) return null;
  return {
    ...normalizeExamData(parsed.data),
    source: 'heuristic',
    warning:
      'Your device could not reach the AI service, so these questions were extracted locally. Please double-check them before relying on the answer key.',
  };
}

export async function generateExamFromText(rawText: string, titleHint?: string): Promise<ExamData> {
  return generateExamFromDocument({ rawText, titleHint });
}
