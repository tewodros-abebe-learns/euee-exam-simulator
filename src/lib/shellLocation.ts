/**
 * Where the student was standing when the page went away.
 *
 * The crash screen offers "Reload page", but a reload starts React from scratch
 * and the app's `view` state began at the dashboard, so reloading after a crash
 * dumped the student back on Home — and if they were in My Exams, they had to
 * click back in to find the paper they were working on.
 *
 * Remembering the tab (Home or My Exams) is enough to make a reload land where
 * the student actually was: the exam screen is restored separately from the
 * in-progress snapshot, and the other screens (timer, summary, upload) are
 * transient by design and deliberately not resurrected.
 *
 * This module also owns the crash counter used by the crash screen. Two crashes
 * in a row mean the page itself is the problem, so the second reload clears the
 * remembered location instead of looping the student into the same failure.
 */

import { safeGetItem, safeRemoveItem, safeSetItem } from './safeStorage';
import { ACTIVE_EXAM_STATE_KEY } from './examProgress';

export type ShellTab = 'HOME' | 'MY_EXAM';

const TAB_KEY = 'euee_last_tab';
const CRASH_KEY = 'euee_crash_streak';

/** Only the two real entrance screens are restorable. */
export function parseShellTab(value: unknown): ShellTab {
  return value === 'MY_EXAM' ? 'MY_EXAM' : 'HOME';
}

export function readShellTab(): ShellTab {
  return parseShellTab(safeGetItem(TAB_KEY));
}

export function saveShellTab(tab: ShellTab): void {
  safeSetItem(TAB_KEY, parseShellTab(tab));
}

export function clearShellLocation(): void {
  safeRemoveItem(TAB_KEY);
}

/**
 * Counts how many times the page has crashed since it last mounted.
 *
 * A successful mount clears it, so a number of two or more really does mean
 * "the reload itself crashed again" rather than "an unrelated crash days ago".
 */
export function readCrashStreak(): number {
  const raw = safeGetItem(CRASH_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 99) : 0;
}

export function recordCrash(): number {
  const next = readCrashStreak() + 1;
  safeSetItem(CRASH_KEY, String(next));
  return next;
}

export function clearCrashStreak(): void {
  safeRemoveItem(CRASH_KEY);
}

/**
 * Puts the app back to its safest entrance: Home, with no exam to re-open.
 *
 * Used only when reloading has already failed once. The attempt itself is kept
 * in My Exams and the student's answered sessions are stored separately, so
 * nothing is lost by not jumping straight back into it.
 */
export function resetToSafestEntrance(): void {
  clearShellLocation();
  safeRemoveItem(ACTIVE_EXAM_STATE_KEY);
}
