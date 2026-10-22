import { useSyncExternalStore } from 'react';
import { SUBJECTS as BUILTIN_SUBJECTS } from './subjects';

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
  const subjects = snapshot ? snapshot.split('\u0000') : LIST_BUILTIN;
  return { subjects, addSubject, removeSubject };
}

/**
 * Compares an exam's subject with a folder name.
 * Built-in aliases still match ("Maths" → "Math"); anything else compares as
 * plain text, so a custom "Agriculture" folder collects exactly that subject.
 */
export function subjectMatchesFolder(examSubject: string | undefined | null, folder: string): boolean {
  const folderName = sanitize(folder);
  if (!folderName || folderName.toLowerCase() === 'general') return true;
  if (!examSubject) return false;

  const key = (value: string) => sanitize(value).toLowerCase();
  return key(examSubject) === key(folderName) || key(examSubject) === canonicalKey(folderName);
}

/** Canonical key for a subject name, resolving the built-in aliases. */
export function canonicalKey(raw: string | undefined | null): string {
  const value = sanitize(raw || '').toLowerCase();
  const aliases: Record<string, string> = {
    maths: 'math',
    mathematics: 'math',
    'scholastic aptitude': 'aptitude',
    'scholastic aptitude test': 'aptitude',
  };
  return aliases[value] || value;
}

export const BUILTIN_SUBJECT_LIST: readonly string[] = LIST_BUILTIN;
