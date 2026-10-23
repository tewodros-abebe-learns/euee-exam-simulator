/**
 * Notices papers that were deleted somewhere else.
 *
 * The library merges what is on the device with what the cloud sends, and the
 * merge only ever added: an exam deleted on another phone (or in another
 * browser) stayed on this device forever, could not be opened, and inflated
 * every load. Nothing pruned it, because "missing from the cloud" and "created
 * here a moment ago and not uploaded yet" look identical in a single snapshot.
 *
 * The fix is to remember which ids each account has actually seen come back
 * from the cloud. A paper that was there before and is gone now was deleted
 * elsewhere — that is safe to remove, because a paper waiting to be uploaded
 * has never appeared in a snapshot and so is never in this list.
 *
 * Everything is bounded and best-effort: this can only ever delete a device
 * copy of a paper the server no longer has, and it never writes to Firestore.
 */

import { safeGetItem, safeRemoveItem, safeSetItem } from './safeStorage';

const STORAGE_KEY = 'euee_cloud_seen_exams';
/** Plenty for a personal library; keeps the record small. */
const MAX_TRACKED_IDS = 500;

interface SeenRecord {
  uid: string;
  ids: string[];
}

function readRecord(): SeenRecord | null {
  const raw = safeGetItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SeenRecord> | null;
    if (!parsed || typeof parsed.uid !== 'string' || !Array.isArray(parsed.ids)) return null;
    return {
      uid: parsed.uid,
      ids: parsed.ids.filter((id): id is string => typeof id === 'string' && id.length > 0),
    };
  } catch {
    return null;
  }
}

/**
 * Ids this account was last seen owning in the cloud.
 *
 * Returns an empty list for a different account: one student's history must
 * never be used to prune another student's library.
 */
export function readSeenExamIds(uid: string | null | undefined): string[] {
  if (!uid) return [];
  const record = readRecord();
  if (!record || record.uid !== uid) return [];
  return record.ids;
}

/** Records the ids the latest cloud snapshot contained. */
export function writeSeenExamIds(uid: string | null | undefined, ids: string[]): void {
  if (!uid) return;
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= MAX_TRACKED_IDS) break;
  }
  safeSetItem(STORAGE_KEY, JSON.stringify({ uid, ids: unique }));
}

export function clearSeenExamIds(): void {
  safeRemoveItem(STORAGE_KEY);
}

/**
 * Ids that were in the previous snapshot but are not in this one.
 *
 * Deliberately conservative: an empty snapshot (a momentarily empty read, a
 * permission change, a fresh account) never deletes anything, and neither does
 * a first run where nothing was remembered yet.
 */
export function findRemovedExamIds(previous: string[], current: string[]): string[] {
  if (previous.length === 0 || current.length === 0) return [];
  const present = new Set(current);
  return previous.filter((id) => !present.has(id));
}
