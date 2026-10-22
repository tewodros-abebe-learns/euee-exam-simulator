import { useMemo, useSyncExternalStore } from 'react';
import {
  SUBJECTS as BUILTIN_SUBJECTS,
  canonicalSubjectKey,
  subjectMatchesFolder,
} from './subjects';

/**
 * Subjects are folders. The built-in ones are a starting point, not a rule:
 * a student can add their own (or a teacher can name a unit) and it becomes a
 * real folder everywhere — dashboard, filters and the move dialog.
 *
 * Custom names live in localStorage, are de-duplicated case-insensitively and
 * are broadcast so every open screen updates without a reload.
 */

const STORAGE_KEY = 'euee_custom_subjects';
const LIST_BUILTIN = [...BUILTIN_SUBJECTS];
const MAX_NAME_LENGTH = 40;
const MAX_SUBJECTS = 40;

let cached: string[] | null = null;
const listeners = new Set<() => void>();

function sanitize(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}

function readFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set(LIST_BUILTIN.map((s) => s.toLowerCase()));
    const result: string[] = [];
    for (const entry of parsed) {
      if (typeof entry !== 'string') continue;
      const name = sanitize(entry);
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      result.push(name);
    }
    return result.slice(0, MAX_SUBJECTS);
  } catch {
    // Storage blocked or corrupt: built-ins still work.
    return [];
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function getCustomSubjects(): string[] {
  if (cached === null) cached = readFromStorage();
  return cached;
}

/** Built-in subjects followed by the student's own, without duplicates. */
export function listSubjects(): string[] {
  const builtinLower = new Set(LIST_BUILTIN.map((s) => s.toLowerCase()));
  const custom = getCustomSubjects().filter((name) => !builtinLower.has(name.toLowerCase()));
  return [...LIST_BUILTIN, ...custom];
}

/**
 * Adds a subject. Returns the stored display name, the existing name when it
 * already exists (case-insensitive), or null when the input is unusable.
 */
export function addSubject(raw: string): string | null {
  const name = sanitize(raw || '');
  if (name.length < 2) return null;

  const existing = listSubjects().find((subject) => subject.toLowerCase() === name.toLowerCase());
  if (existing) return existing;

  const custom = getCustomSubjects();
  if (custom.length >= MAX_SUBJECTS) return null;

  const next = [...custom, name];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Without storage the subject still works for this session.
  }
  cached = next;
  emit();
  return name;
}

export function removeSubject(raw: string): void {
  const name = sanitize(raw);
  const builtinLower = new Set(LIST_BUILTIN.map((s) => s.toLowerCase()));
  if (builtinLower.has(name.toLowerCase())) return;

  const next = getCustomSubjects().filter((subject) => subject.toLowerCase() !== name.toLowerCase());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore: the list is best-effort.
  }
  cached = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Keep other tabs (and the storage event) in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cached = readFromStorage();
      emit();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot(): string {
  // useSyncExternalStore needs a stable value between changes; the joined list
  // is cheap and avoids returning a new array each render.
  return listSubjects().join('\u0000');
}

export function useSubjects(): { subjects: string[]; addSubject: typeof addSubject; removeSubject: typeof removeSubject } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => LIST_BUILTIN.join('\u0000'));
  // A stable array identity keeps dependent memos from recomputing on every render.
  const subjects = useMemo(
    () => (snapshot ? snapshot.split('\u0000') : [...LIST_BUILTIN]),
    [snapshot]
  );
  return { subjects, addSubject, removeSubject };
}

/**
 * Which folder an exam belongs in.
 *
 * `General` is the fallback bucket — it collects everything that has no folder
 * of its own, so a folder card's count always equals what you see when you
 * open it. Without this, an exam whose subject matched no folder appeared in
 * every "General" view but in no folder count.
 */
export function folderForSubject(
  examSubject: string | undefined | null,
  folders: readonly string[]
): string {
  const match = folders.find(
    (folder) => folder.toLowerCase() !== 'general' && subjectMatchesFolder(examSubject, folder)
  );
  return match || 'General';
}

/**
 * Guarantees that a subject name has a folder, and returns the name to store.
 *
 * Used when a paper arrives with its own subject ("Agricultural Science"):
 * without this the exam would be saved with a subject no folder lists, so it
 * would be reachable only through "All". Built-in spellings are folded onto
 * their canonical folder instead of creating a duplicate.
 */
export function ensureSubjectFolder(raw: string | undefined | null): string {
  const name = sanitize(raw || '');
  if (!name) return 'General';
  const existing = listSubjects().find(
    (subject) => canonicalSubjectKey(subject) === canonicalSubjectKey(name)
  );
  if (existing) return existing;
  return addSubject(name) || name;
}

/** Canonical key for a subject name, resolving the built-in aliases. */
export function canonicalKey(raw: string | undefined | null): string {
  return canonicalSubjectKey(sanitize(raw));
}

export { subjectMatchesFolder };

export const BUILTIN_SUBJECT_LIST: readonly string[] = LIST_BUILTIN;
