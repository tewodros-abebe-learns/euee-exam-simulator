/**
 * Bounded async work must never block the UI.
 *
 * Firestore resolves a write only once the backend acknowledges it. When the
 * backend is unreachable — offline, a wrong project, or a database that was
 * never created — that promise can stay pending indefinitely. Awaiting it
 * before navigating left screens stuck on a spinner forever ("Add exam…",
 * "Finish exam"). The same applies to a blocked IndexedDB. These helpers let
 * the app finish the local work first and treat the rest as best-effort.
 */

/** Default budget for a single background network write. */
export const CLOUD_WRITE_TIMEOUT_MS = 6000;

/** Budget for a local (IndexedDB) save the next screen depends on. */
export const LOCAL_WRITE_TIMEOUT_MS = 3000;

/**
 * Budget for a write the student is waiting on (finishing an exam). Short
 * enough to keep the button responsive, long enough for a normal save.
 */
export const CRITICAL_WRITE_TIMEOUT_MS = 4000;

/**
 * Runs `work` with a hard timeout. Resolves `true` when it completed, `false`
 * when it failed or timed out — never rejects, so it is always safe to fire
 * and forget.
 */
export async function runWithTimeout(
  work: () => Promise<unknown>,
  timeoutMs: number = CLOUD_WRITE_TIMEOUT_MS,
  label = 'Background write'
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    });

    const attempt = Promise.resolve()
      .then(work)
      .then(() => true)
      .catch((error) => {
        console.warn(`${label} failed:`, error);
        return false;
      });

    return await Promise.race([attempt, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
