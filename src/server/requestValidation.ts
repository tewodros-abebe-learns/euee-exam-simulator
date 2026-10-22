/**
 * Request validation for the AI exam endpoint.
 *
 * Everything here is deliberately dependency-free so the same rules apply to
 * the Express dev/production server and the Vercel serverless function.
 */

export const MAX_TEXT_LENGTH = 1_000_000; // ~1 MB of extracted text
export const MAX_BASE64_LENGTH = 20 * 1024 * 1024; // ~15 MB file (base64 inflates by 1/3)
export const MAX_FILE_NAME_LENGTH = 200;

/** File types the extractor is allowed to receive. */
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
]);

export interface ExamRequest {
  rawText?: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
}

export type ValidationResult =
  | { ok: true; body: ExamRequest }
  | { ok: false; status: number; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Rejects anything that is not a small, well-typed object describing one
 * document. Unknown keys are dropped rather than forwarded to the AI service.
 */
export function validateExamRequest(input: unknown): ValidationResult {
  if (!isPlainObject(input)) {
    return { ok: false, status: 400, error: 'Expected a JSON object describing the document.' };
  }

  const rawText = input.rawText;
  const fileBase64 = input.fileBase64;
  const mimeType = input.mimeType;
  const fileName = input.fileName;

  if (rawText !== undefined && typeof rawText !== 'string') {
    return { ok: false, status: 400, error: 'rawText must be a string.' };
  }
  if (fileBase64 !== undefined && typeof fileBase64 !== 'string') {
    return { ok: false, status: 400, error: 'fileBase64 must be a string.' };
  }
  if (mimeType !== undefined && typeof mimeType !== 'string') {
    return { ok: false, status: 400, error: 'mimeType must be a string.' };
  }
  if (fileName !== undefined && typeof fileName !== 'string') {
    return { ok: false, status: 400, error: 'fileName must be a string.' };
  }
  if (typeof fileName === 'string' && fileName.length > MAX_FILE_NAME_LENGTH) {
    return { ok: false, status: 400, error: 'That file name is too long.' };
  }

  const hasText = typeof rawText === 'string' && rawText.trim().length > 0;
  const hasFile = typeof fileBase64 === 'string' && fileBase64.trim().length > 0;

  if (!hasText && !hasFile) {
    return {
      ok: false,
      status: 400,
      error: 'No document text or file content provided to generate exam from.',
    };
  }

  if (hasText && (rawText as string).length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `Document text exceeds the ${Math.round(MAX_TEXT_LENGTH / 1000)}K character limit. Please upload a smaller section.`,
    };
  }

  if (hasFile && (fileBase64 as string).length > MAX_BASE64_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: 'File upload size exceeds the 15MB limit. Please compress or split the document.',
    };
  }

  if (hasFile && typeof mimeType === 'string' && mimeType.length > 0 && !ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      status: 415,
      error: 'That file type is not supported. Upload a PDF, an image, or a text file.',
    };
  }

  return {
    ok: true,
    body: {
      ...(hasText ? { rawText: (rawText as string).trim() } : {}),
      ...(hasFile ? { fileBase64: fileBase64 as string } : {}),
      ...(typeof mimeType === 'string' && mimeType.length > 0 ? { mimeType } : {}),
      ...(typeof fileName === 'string' && fileName.length > 0 ? { fileName } : {}),
    },
  };
}

/**
 * Caps how many generations one client can have in flight at once.
 *
 * The rate limiter counts requests per window; without this, one client could
 * still open dozens of simultaneous generations and hold the AI quota (and the
 * server's memory) hostage.
 */
export class ConcurrencyLimiter {
  private active = new Map<string, number>();

  constructor(private readonly limit = 2, private readonly maxTracked = 5000) {}

  tryAcquire(key: string): boolean {
    const current = this.active.get(key) ?? 0;
    if (current >= this.limit) return false;
    if (this.active.size >= this.maxTracked && !this.active.has(key)) {
      // Drop finished keys so a long-running process cannot leak memory.
      for (const [tracked, count] of this.active) {
        if (count <= 0) this.active.delete(tracked);
      }
    }
    this.active.set(key, current + 1);
    return true;
  }

  release(key: string): void {
    const current = this.active.get(key) ?? 0;
    if (current <= 1) this.active.delete(key);
    else this.active.set(key, current - 1);
  }
}
