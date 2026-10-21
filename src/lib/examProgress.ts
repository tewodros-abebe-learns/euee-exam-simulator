/**
 * A single source of truth for the localStorage key that holds an in-progress
 * attempt. It is derived from the exam id (falling back to the title) so that
 * two different papers with the same title can never share progress, and so a
 * retake never inherits the previous attempt's answers.
 */
export function getExamProgressKey(examId?: string | null, examTitle?: string | null): string {
  const identity = (examId || examTitle || 'exam').trim();
  const safeIdentity = identity.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 180);
  return `exam_progress_${safeIdentity}`;
}

export const ACTIVE_EXAM_STATE_KEY = 'euee_active_exam_state';

export function clearExamProgress(examId?: string | null, examTitle?: string | null): void {
  try {
    localStorage.removeItem(getExamProgressKey(examId, examTitle));
  } catch {
    // Storage may be unavailable (private mode); nothing else to do.
  }
}
