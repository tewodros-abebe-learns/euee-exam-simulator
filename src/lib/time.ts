/**
 * Time helpers shared by the timer selection, exam interface and summary.
 * The exam countdown is always derived from an absolute deadline so that
 * background-tab throttling or device sleep cannot stretch the clock.
 */

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${hours > 0 ? `${hours}:` : ''}${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/** The `Date.now()` value at which the exam must be auto-submitted. */
export function computeDeadline(startTime: number, timeLimitSeconds: number): number | null {
  if (!timeLimitSeconds || timeLimitSeconds <= 0) return null;
  return startTime + timeLimitSeconds * 1000;
}

export function remainingSeconds(deadline: number | null, now: number = Date.now()): number | null {
  if (deadline === null) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** Remaining time of a stored session, used when resuming. */
export function getRemainingForSession(startTime: number, timeLimitSeconds: number): number {
  const limit = Math.max(0, Math.floor(timeLimitSeconds || 0));
  if (limit === 0) return 0;
  const elapsed = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
  return Math.max(0, limit - elapsed);
}
