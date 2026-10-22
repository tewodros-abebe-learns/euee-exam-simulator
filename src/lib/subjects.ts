/**
 * Single source of truth for subject names.
 *
 * The bundled papers historically used several spellings ("Mathematics",
 * "Math", "Aptitude", "Scholastic Aptitude"), which meant the same folder
 * showed a different set of exams depending on which screen you were on.
 */

/** Any key that exists in the English locale (both locales share the same keys). */
export type TranslationKey = keyof typeof import('../i18n/translations').translations.en;

export const SUBJECTS = [
  'General',
  'Math',
  'Biology',
  'English',
  'Physics',
  'Chemistry',
  'Aptitude',
  'SAT',
] as const;

export type Subject = (typeof SUBJECTS)[number];

const SUBJECT_ALIASES: Record<string, Subject> = {
  general: 'General',
  math: 'Math',
  maths: 'Math',
  mathematics: 'Math',
  biology: 'Biology',
  english: 'English',
  physics: 'Physics',
  chemistry: 'Chemistry',
  aptitude: 'Aptitude',
  'scholastic aptitude': 'Aptitude',
  'scholastic aptitude test': 'Aptitude',
  sat: 'SAT',
};

/**
 * Comparison key for a subject name.
 *
 * Two folders must only be considered different when they really are: a paper
 * stored as "Mathematics" belongs in the "Math" folder, and "Scholastic
 * Aptitude Test" belongs in "Aptitude". Custom subjects keep their own text,
 * so they never collapse into a built-in by accident.
 */
export function canonicalSubjectKey(raw?: string | null): string {
  const key = (raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return SUBJECT_ALIASES[key] ? SUBJECT_ALIASES[key].toLowerCase() : key;
}

/** Maps any stored/legacy spelling onto a canonical subject. */
export function normalizeSubject(raw?: string | null): Subject {
  if (!raw) return 'General';
  const key = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return SUBJECT_ALIASES[key] || 'General';
}

/** True when an exam belongs in the folder for `subject`. */
export function matchesSubject(examSubject: string | undefined | null, subject: string): boolean {
  const folder = normalizeSubject(subject);
  if (folder === 'General') return true;
  return normalizeSubject(examSubject) === folder;
}

/** Translation key for a subject label. */
export function subjectLabelKey(subject: string): TranslationKey {
  switch (normalizeSubject(subject)) {
    case 'Math':
      return 'subjectMath';
    case 'Biology':
      return 'subjectBiology';
    case 'English':
      return 'subjectEnglish';
    case 'Physics':
      return 'subjectPhysics';
    case 'Chemistry':
      return 'subjectChemistry';
    case 'Aptitude':
      return 'subjectAptitude';
    case 'SAT':
      return 'subjectSAT';
    default:
      return 'subjectGeneral';
  }
}

/**
 * True when an exam belongs in the folder named `folder`.
 *
 * `General` is the catch-all: it matches anything, which is why folder counts
 * use `folderForSubject` (below) to keep "General" as the leftover bucket.
 */
export function subjectMatchesFolder(examSubject: string | undefined | null, folder: string): boolean {
  const folderName = (folder || '').trim();
  if (!folderName || folderName.toLowerCase() === 'general') return true;
  if (!examSubject || !examSubject.trim()) return false;
  return canonicalSubjectKey(examSubject) === canonicalSubjectKey(folderName);
}

/**
 * True when a subject name maps onto a built-in subject (including aliases such
 * as "Mathematics" → Math). Custom, user-created subjects return false.
 */
export function isBuiltinSubject(raw?: string | null): boolean {
  if (!raw) return false;
  return raw.trim().toLowerCase().replace(/\s+/g, ' ') in SUBJECT_ALIASES;
}

/**
 * Display name for a subject: translated for the built-ins, the student's own
 * text for custom folders.
 */
export function subjectDisplayName(
  raw: string | undefined | null,
  t: (key: TranslationKey) => string
): string {
  const name = (raw || '').trim();
  if (!name) return t('subjectGeneral');
  return isBuiltinSubject(name) ? t(subjectLabelKey(name)) : name;
}

export const GRADES = ['Grade 12', 'Grade 11', 'Grade 10', 'Grade 9', 'General'] as const;

export function gradeLabelKey(grade?: string | null): TranslationKey {
  switch (grade) {
    case 'Grade 12':
      return 'grade12';
    case 'Grade 11':
      return 'grade11';
    case 'Grade 10':
      return 'grade10';
    case 'Grade 9':
      return 'grade9';
    default:
      return 'gradeGeneral';
  }
}
