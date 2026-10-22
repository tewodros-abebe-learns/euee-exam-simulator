/**
 * Pending exam edits (rename / move / delete).
 *
 * Why this exists: the device copy of an exam and the cloud copy are written
 * separately. A rename or a delete that reached IndexedDB but not Firestore
 * used to be quietly undone — the next cloud snapshot pushed the old title back
 * (so the rename "reverted") or re-added a deleted exam (so it "came back").
 * That is the database instability this module removes:
 *
 *  - every edit is recorded here *before* the cloud write is attempted;
 *  - the list is overlaid onto whatever the cloud snapshot contains, so the
 *    student always sees their own latest edit;
 *  - deleted ids are filtered out of the cloud data until Firestore confirms
 *    the delete, so a failed delete can never resurrect an exam;
 *  - the edits are replayed on the next start / reconnect, then cleared.
 *
 * It is deliberately dependency-free (localStorage only) so it stays testable.
 */

export type ExamMutation =
  | { id: string; type: 'update'; fields: Record<string, string>; at: number }
  | { id: string; type: 'delete'; at: number };

const STORAGE_KEY = 'euee_pending_exam_ops';
const MAX_PENDING = 200;

let cache: ExamMutation[] | null = null;

function readFromStorage(): ExamMutation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const result: ExamMutation[] = [];
    // Newest first; one entry per exam (a later edit supersedes the earlier).
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const id = typeof entry.id === 'string' ? entry.id : '';
      if (!id || seen.has(id)) continue;
      const at = typeof entry.at === 'number' ? entry.at : 0;
      if (entry.type === 'delete') {
        seen.add(id);
        result.push({ id, type: 'delete', at });
      } else if (entry.type === 'update' && entry.fields && typeof entry.fields === 'object') {
        const fields: Record<string, string> = {};
        for (const [key, value] of Object.entries(entry.fields as Record<string, unknown>)) {
          if (typeof value === 'string') fields[key] = value;
        }
        if (Object.keys(fields).length === 0) continue;
        seen.add(id);
        result.push({ id, type: 'update', fields, at });
      }
    }
    return result.slice(0, MAX_PENDING);
  } catch {
    // Private mode or corrupt data: behave as if nothing is pending.
    return [];
  }
}

function persist(list: ExamMutation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Without storage the edits still hold for this session.
  }
}

function getList(): ExamMutation[] {
  if (cache === null) cache = readFromStorage();
  return cache;
}

function commit(next: ExamMutation[]) {
  cache = next.slice(0, MAX_PENDING);
  persist(cache);
}

/** Every pending edit, newest first. */
export function getExamMutations(): ExamMutation[] {
  return [...getList()];
}

export function queueExamUpdate(id: string, fields: Record<string, string>): void {
  if (!id) return;
  const others = getList().filter((entry) => entry.id !== id);
  // Keep earlier pending fields so two quick edits both survive the replay.
  const previous = getList().find((entry) => entry.id === id);
  const mergedFields =
    previous && previous.type === 'update' ? { ...previous.fields, ...fields } : { ...fields };
  commit([{ id, type: 'update', fields: mergedFields, at: Date.now() }, ...others]);
}

export function queueExamDelete(id: string): void {
  if (!id) return;
  commit([{ id, type: 'delete', at: Date.now() }, ...getList().filter((entry) => entry.id !== id)]);
}

export function clearExamMutation(id: string): void {
  const next = getList().filter((entry) => entry.id !== id);
  if (next.length === getList().length) return;
  commit(next);
}

/** True while a delete for this exam has not been confirmed by the backend. */
export function isExamDeleted(id: string | undefined | null): boolean {
  if (!id) return false;
  return getList().some((entry) => entry.id === id && entry.type === 'delete');
}

/**
 * Applies the student's unsynced edits to an exam, so a stale cloud copy can
 * never visually overwrite a newer local rename or move.
 * Returns `null` when the exam is pending deletion.
 */
export function overlayExamMutation<T extends { id: string }>(exam: T): T | null {
  const pending = getList().find((entry) => entry.id === exam.id);
  if (!pending) return exam;
  if (pending.type === 'delete') return null;
  return { ...exam, ...pending.fields } as T;
}

/** Same, for a whole list; also drops exams that are pending deletion. */
export function applyExamMutations<T extends { id: string }>(exams: T[]): T[] {
  const result: T[] = [];
  for (const exam of exams) {
    const merged = overlayExamMutation(exam);
    if (merged) result.push(merged);
  }
  return result;
}
