/**
 * Single source of truth for subject names.
 *
 * The bundled papers historically used several spellings ("Mathematics",
 * "Math", "Aptitude", "Scholastic Aptitude"), which meant the same folder
 * showed a different set of exams depending on which screen you were on.
 */

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
export function subjectLabelKey(subject: string): string {
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

export const GRADES = ['Grade 12', 'Grade 11', 'Grade 10', 'Grade 9', 'General'] as const;

export function gradeLabelKey(grade?: string | null): string {
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
