import { useMemo, useSyncExternalStore } from 'react';
import {
  SUBJECTS as BUILTIN_SUBJECTS,
  canonicalSubjectKey,
} from './subjects';

/**
 * Subjects are folders.
 *
 * The built-in names (Chemistry, Physics, SAT…) are a starting point, not a
 * rule: a student may rename one ("Chem"), delete the ones they never use, or
 * add their own. Everything is stored as preferences, never as database
 * documents, so managing folders can never corrupt an exam:
 *
 *  - Renaming changes the folder's *label*. Exams keep the subject string they
 *    were saved with, and matching goes through a stable folder key, so no
 *    paper is ever rewritten or lost.
 *  - Deleting a folder only hides it. Its papers are not touched; they fall
 *    back into General (the bucket for anything without a folder of its own),
 *    which is visible immediately and is reversible by re-creating the folder.
 *
 * Preferences live in localStorage, are de-duplicated case-insensitively and
 * are broadcast so every open screen updates without a reload.
 */

const PREFS_KEY = 'euee_folder_prefs';
/** Older releases stored only the custom names as a string array. */
const LEGACY_KEY = 'euee_custom_subjects';

const BUILTIN_KEYS: readonly string[] = BUILTIN_SUBJECTS.map((name) => canonicalSubjectKey(name));
const GENERAL_KEY = canonicalSubjectKey('General');
const MAX_NAME_LENGTH = 40;
const MAX_CUSTOM_FOLDERS = 40;
const MIN_NAME_LENGTH = 2;

export interface Folder {
  /** Stable identity. Never changes, even when the folder is renamed. */
  key: string;
  /** What the student sees (custom label, or the built-in name). */
  name: string;
  builtin: boolean;
  /** General is structural: it is the fallback bucket, so it stays. */
  locked: boolean;
}

export interface RenameResult {
  ok: boolean;
  /** Present on success: the name the folder now shows. */
  name?: string;
  /** Present on failure, so the dialog can explain itself. */
  error?: 'invalid' | 'duplicate' | 'locked' | 'missing';
}

interface FolderEntry {
  key: string;
  name: string;
}

interface FolderPrefs {
  /** Built-in key → the name the student renamed it to. */
  labels: Record<string, string>;
  /** Built-in keys the student deleted. */
  hidden: string[];
  /** Student-created folders, in creation order. */
  custom: FolderEntry[];
}

let cached: FolderPrefs | null = null;
// Resolving a folder key happens for every exam on every render; building the
// folder list once per change keeps that cheap.
let foldersCache: Folder[] | null = null;
const listeners = new Set<() => void>();

function invalidateFolders() {
  foldersCache = null;
}

function sanitize(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}

function emptyPrefs(): FolderPrefs {
  return { labels: {}, hidden: [], custom: [] };
}

function isBuiltinKey(key: string): boolean {
  return BUILTIN_KEYS.includes(key);
}

function readLegacyCustomNames(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}

function readFromStorage(): FolderPrefs {
  const prefs = emptyPrefs();
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PREFS_KEY);
  } catch {
    raw = null;
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<FolderPrefs> | null;
      if (parsed && typeof parsed === 'object') {
        if (parsed.labels && typeof parsed.labels === 'object') {
          for (const [key, value] of Object.entries(parsed.labels)) {
            const name = typeof value === 'string' ? sanitize(value) : '';
            // Only built-in folders can carry a label; General keeps its name.
            if (name.length >= MIN_NAME_LENGTH && isBuiltinKey(key) && key !== GENERAL_KEY) {
              prefs.labels[key] = name;
            }
          }
        }
        if (Array.isArray(parsed.hidden)) {
          for (const value of parsed.hidden) {
            if (typeof value === 'string' && isBuiltinKey(value) && value !== GENERAL_KEY) {
              if (!prefs.hidden.includes(value)) prefs.hidden.push(value);
            }
          }
        }
        if (Array.isArray(parsed.custom)) {
          const seen = new Set<string>();
          for (const entry of parsed.custom) {
            const name = typeof (entry as FolderEntry)?.name === 'string'
              ? sanitize((entry as FolderEntry).name)
              : '';
            if (name.length < MIN_NAME_LENGTH) continue;
            const key = canonicalSubjectKey(name);
            if (!key || isBuiltinKey(key) || seen.has(key)) continue;
            seen.add(key);
            prefs.custom.push({ key, name });
            if (prefs.custom.length >= MAX_CUSTOM_FOLDERS) break;
          }
        }
      }
    } catch {
      // Corrupt preferences: fall through to the defaults (and the migration).
    }
  } else {
    // First run under this model: adopt any folders created by older releases.
    const seen = new Set<string>();
    for (const rawName of readLegacyCustomNames()) {
      const name = sanitize(rawName);
      if (name.length < MIN_NAME_LENGTH) continue;
      const key = canonicalSubjectKey(name);
      if (!key || isBuiltinKey(key) || seen.has(key)) continue;
      seen.add(key);
      prefs.custom.push({ key, name });
      if (prefs.custom.length >= MAX_CUSTOM_FOLDERS) break;
    }
    if (prefs.custom.length > 0) persist(prefs);
  }

  return prefs;
}

function persist(prefs: FolderPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Without storage the folders still work for this session.
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function getPrefs(): FolderPrefs {
  if (cached === null) cached = readFromStorage();
  return cached;
}

function commit(next: FolderPrefs) {
  cached = next;
  invalidateFolders();
  persist(next);
  emit();
}

/** Every folder the student can currently see, in display order. */
export function listFolders(): Folder[] {
  if (foldersCache) return foldersCache;
  const prefs = getPrefs();
  const folders: Folder[] = BUILTIN_SUBJECTS.filter(
    (name) => !prefs.hidden.includes(canonicalSubjectKey(name))
  ).map((name) => {
    const key = canonicalSubjectKey(name);
    return {
      key,
      name: prefs.labels[key] || name,
      builtin: true,
      locked: key === GENERAL_KEY,
    };
  });

  for (const entry of prefs.custom) {
    folders.push({ key: entry.key, name: entry.name, builtin: false, locked: false });
  }

  foldersCache = folders;
  return folders;
}

/** Folder names only — what the chips, pickers and move dialog use. */
export function listSubjects(): string[] {
  return listFolders().map((folder) => folder.name);
}

export function getCustomSubjects(): string[] {
  return getPrefs().custom.map((entry) => entry.name);
}

/**
 * Resolves any spelling of a folder — its current label, a built-in name or an
 * old alias like "Mathematics" — to the folder's stable key.
 *
 * This is what lets a renamed folder keep all of its papers without touching a
 * single database document: the exams still say "Chemistry", the folder now
 * says "Chem", and both resolve to `chemistry`.
 */
export function folderKeyOf(raw: string | undefined | null): string {
  const name = sanitize(raw || '');
  if (!name) return '';
  const exact = listFolders().find((folder) => folder.name.toLowerCase() === name.toLowerCase());
  if (exact) return exact.key;
  return canonicalSubjectKey(name);
}

/** Finds a folder by any of its names (current label or original spelling). */
export function findFolder(raw: string | undefined | null): Folder | undefined {
  const name = sanitize(raw || '');
  if (!name) return undefined;
  const key = folderKeyOf(name);
  return listFolders().find((folder) => folder.key === key);
}

/**
 * Adds a folder. Returns the stored display name, the existing name when it
 * already exists (case-insensitive), or null when the input is unusable.
 *
 * Re-creating a folder that was deleted is allowed: it simply becomes visible
 * again, with its papers already where they belong.
 */
export function addSubject(raw: string): string | null {
  const name = sanitize(raw || '');
  if (name.length < MIN_NAME_LENGTH) return null;

  const key = canonicalSubjectKey(name);
  if (!key) return null;

  const prefs = getPrefs();
  const existing = listFolders().find(
    (folder) => folder.key === key || folder.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing.name;

  // Re-creating a deleted built-in: un-hide it instead of making a duplicate.
  if (isBuiltinKey(key)) {
    const next: FolderPrefs = {
      ...prefs,
      hidden: prefs.hidden.filter((hiddenKey) => hiddenKey !== key),
    };
    commit(next);
    return listFolders().find((folder) => folder.key === key)?.name || name;
  }

  if (prefs.custom.length >= MAX_CUSTOM_FOLDERS) return null;

  commit({ ...prefs, custom: [...prefs.custom, { key, name }] });
  return name;
}

/**
 * Renames a folder. Only its label changes — the key, and therefore every exam
 * that lives in it, is untouched.
 */
export function renameSubject(raw: string, nextRaw: string): RenameResult {
  const folder = findFolder(raw);
  if (!folder) return { ok: false, error: 'missing' };
  if (folder.locked) return { ok: false, error: 'locked' };

  const name = sanitize(nextRaw || '');
  if (name.length < MIN_NAME_LENGTH) return { ok: false, error: 'invalid' };

  const nextKey = canonicalSubjectKey(name);
  const clashes = listFolders().some(
    (other) =>
      other.key !== folder.key &&
      (other.name.toLowerCase() === name.toLowerCase() || other.key === nextKey)
  );
  // Renaming onto another built-in's identity would merge two folders.
  if (clashes || (nextKey !== folder.key && isBuiltinKey(nextKey))) {
    return { ok: false, error: 'duplicate' };
  }

  const prefs = getPrefs();
  if (folder.builtin) {
    commit({ ...prefs, labels: { ...prefs.labels, [folder.key]: name } });
  } else {
    commit({
      ...prefs,
      custom: prefs.custom.map((entry) => (entry.key === folder.key ? { ...entry, name } : entry)),
    });
  }
  return { ok: true, name };
}

/**
 * Deletes a folder from the list. Nothing is deleted from the database: a
 * built-in is hidden (and can be re-created later), a custom folder is removed
 * from the list, and in both cases its papers simply show under General.
 */
export function removeSubject(raw: string): void {
  const folder = findFolder(raw);
  if (!folder || folder.locked) return;

  const prefs = getPrefs();
  if (folder.builtin) {
    const labels = { ...prefs.labels };
    delete labels[folder.key];
    commit({
      ...prefs,
      labels,
      hidden: prefs.hidden.includes(folder.key) ? prefs.hidden : [...prefs.hidden, folder.key],
    });
    return;
  }

  commit({ ...prefs, custom: prefs.custom.filter((entry) => entry.key !== folder.key) });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Keep other tabs (and the storage event) in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key === PREFS_KEY || event.key === LEGACY_KEY) {
      cached = readFromStorage();
      invalidateFolders();
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

const EMPTY_SNAPSHOT = BUILTIN_SUBJECTS.join('\u0000');

export function useSubjects(): {
  subjects: string[];
  folders: Folder[];
  addSubject: typeof addSubject;
  removeSubject: typeof removeSubject;
  renameSubject: typeof renameSubject;
} {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_SNAPSHOT);
  // A stable array identity keeps dependent memos from recomputing on every render.
  const subjects = useMemo(
    () => (snapshot ? snapshot.split('\u0000') : [...BUILTIN_SUBJECTS]),
    [snapshot]
  );
  const folders = useMemo(() => listFolders(), [snapshot]);
  return { subjects, folders, addSubject, removeSubject, renameSubject };
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
  const examKey = folderKeyOf(examSubject);
  if (!examKey) return 'General';
  const match = folders.find(
    (folder) => folder.toLowerCase() !== 'general' && folderKeyOf(folder) === examKey
  );
  return match || 'General';
}

/**
 * True when an exam belongs in the folder named `folder`.
 *
 * `General` is the catch-all: it matches anything, which is why folder counts
 * use `folderForSubject` (above) to keep "General" as the leftover bucket.
 */
export function subjectMatchesFolder(examSubject: string | undefined | null, folder: string): boolean {
  const folderName = sanitize(folder || '');
  if (!folderName || folderName.toLowerCase() === 'general') return true;
  const examKey = folderKeyOf(examSubject);
  if (!examKey) return false;
  return examKey === folderKeyOf(folderName);
}

/**
 * Guarantees that a subject name has a folder, and returns the name to store.
 *
 * Used when a paper arrives with its own subject ("Agricultural Science"):
 * without this the exam would be saved with a subject no folder lists, so it
 * would be reachable only through "All". Built-in spellings are folded onto
 * their canonical folder instead of creating a duplicate, and a folder the
 * student deleted is never resurrected by an import.
 */
export function ensureSubjectFolder(raw: string | undefined | null): string {
  const name = sanitize(raw || '');
  if (!name) return 'General';

  const key = canonicalSubjectKey(name);
  if (getPrefs().hidden.includes(key)) return 'General';

  const existing = listFolders().find((folder) => folder.key === key);
  if (existing) return existing.name;
  return addSubject(name) || name;
}

/** Canonical key for a subject name, resolving the built-in aliases. */
export function canonicalKey(raw: string | undefined | null): string {
  return canonicalSubjectKey(sanitize(raw));
}

export const BUILTIN_SUBJECT_LIST: readonly string[] = BUILTIN_SUBJECTS;
