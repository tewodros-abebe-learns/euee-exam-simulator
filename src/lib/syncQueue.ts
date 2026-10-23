/**
 * When a queued replay can be thrown away.
 *
 * Every finished attempt used to leave a `SAVE_SESSION` entry in the queue for
 * good: the cleanup only recognised attempts that had just been mirrored in the
 * same pass, while the app normally mirrors them directly and marks them
 * synced. So the "changes queued" badge only ever grew, and every reconnect
 * re-uploaded the same attempts.
 *
 * Kept as a pure function so the rules are testable without a browser.
 */

export interface QueueEntry {
  type: string;
  payload?: unknown;
}

export interface SessionLike {
  id: string;
  syncedWithCloud?: boolean;
}

export interface RetireContext {
  /** Every attempt currently stored on the device. */
  sessions: readonly SessionLike[];
  /** Ids mirrored during this sync pass. */
  syncedNow: ReadonlySet<string>;
}

/**
 * True when replaying this entry has nothing left to do:
 *  - it now lives on the server (this pass, or an earlier direct write),
 *  - or the attempt it refers to no longer exists (deleted or pruned).
 */
export function shouldRetireQueueItem(item: QueueEntry, context: RetireContext): boolean {
  if (item.type !== 'SAVE_SESSION') return false;
  const queuedId = (item.payload as { id?: unknown } | undefined)?.id;
  if (typeof queuedId !== 'string' || queuedId.length === 0) return true;

  const stored = context.sessions.find((session) => session.id === queuedId);
  if (!stored) return true;
  if (stored.syncedWithCloud) return true;
  return context.syncedNow.has(queuedId);
}
