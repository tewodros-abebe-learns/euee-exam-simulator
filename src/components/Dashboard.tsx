import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Trash2, Edit2, Loader2, Search, FolderCog, FolderOpen, Upload, Type, X } from 'lucide-react';
import ExamUploadModal from './ExamUploadModal';
import SectionBoundary from './SectionBoundary';
import FolderManager from './FolderManager';
import ExportExamButton from './ExportExamButton';
import type { ImportedExam } from '../lib/examSchema';

import { forgetActiveExam } from '../lib/activeExamState';
import { offlineStorage } from '../lib/offlineStorage';
import { gradeLabelKey, subjectDisplayName } from '../lib/subjects';
import { sortByRecency, toMillis } from '../lib/time';
import { useSubjects, folderForSubject } from '../lib/subjectStore';
import {
  runWithTimeout,
  readWithTimeout,
  LOCAL_WRITE_TIMEOUT_MS,
  CLOUD_WRITE_TIMEOUT_MS,
} from '../lib/cloudWrite';
import {
  applyExamMutations,
  clearExamMutation,
  getExamMutations,
  isExamDeleted,
  queueExamDelete,
  queueExamUpdate,
} from '../lib/examMutations';

interface Exam {
  id: string;
  title: string;
  subject: string;
  grade?: string;
  questions: any[];
  createdAt: any;
}

interface UserExam {
  id: string;
  examId: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  answers: Record<string, string>;
  startTime: number;
  timeLimit: number;
  score?: number;
  total?: number;
  percentage?: number;
  /** Seconds spent, as stored by older and newer releases respectively. */
  timeSpent?: number;
  duration?: number;
  lastUpdated: any;
}

/** Keeps the previous array when the content is identical. */
function sameOrNext<T>(previous: T[], next: T[], signature: (items: T[]) => string): T[] {
  return signature(previous) === signature(next) ? previous : next;
}

/** Cheap identity of a list, so an unchanged snapshot never triggers a render. */
function examsSignature(exams: Exam[]): string {
  return exams
    .map(
      (exam) =>
        `${exam.id}|${exam.title}|${exam.subject}|${exam.grade || ''}|${toMillis(exam.createdAt)}|${exam.questions?.length ?? 0}`
    )
    .join('\u0000');
}

function sessionsSignature(sessions: UserExam[]): string {
  return sessions
    .map(
      (session) =>
        `${session.id}|${session.examId}|${session.status}|${session.score ?? ''}|${session.percentage ?? ''}|${toMillis(session.lastUpdated)}|${Object.keys(session.answers || {}).length}`
    )
    .join('\u0000');
}

interface DashboardProps {
  onContinue: (exam: Exam, session: UserExam) => void;
  onRetake: (exam: Exam) => void;
  onViewSummary: (exam: Exam, session: UserExam) => void;
  onUpload?: (file: File, subject: string, grade: string) => Promise<void>;
  onProcessText?: (text: string, subject: string, grade: string) => Promise<void>;
  onImportExam?: (exam: ImportedExam) => Promise<void>;
  isParsing?: boolean;
}



export default function Dashboard({ onContinue, onRetake, onViewSummary, onUpload, onProcessText, onImportExam, isParsing }: DashboardProps) {
  const { currentUser, isFirebaseAuthed } = useAuth();
  const { isOnline } = useOffline();
  const { t } = useLanguage();
  const [exams, setExams] = useState<Exam[]>([]);
  const [userExams, setUserExams] = useState<UserExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [uploadModalDefaultTab, setUploadModalDefaultTab] = useState<'upload' | 'paste'>('upload');
  
  // Modals state
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [renamingExam, setRenamingExam] = useState<Exam | null>(null);
  const [movingExam, setMovingExam] = useState<Exam | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Escape closes whichever confirmation dialog is open, so a stray key press
  // never traps the student inside a modal.
  useEffect(() => {
    if (!deletingExamId && !renamingExam && !movingExam && !isFolderManagerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (deletingExamId && !isDeleting) setDeletingExamId(null);
      if (renamingExam && !isUpdating) setRenamingExam(null);
      if (movingExam && !isUpdating) setMovingExam(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deletingExamId, renamingExam, movingExam, isFolderManagerOpen, isDeleting, isUpdating]);

  useEffect(() => {
    if (deletingExamId || renamingExam || movingExam || isUploadModalOpen || isFolderManagerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [deletingExamId, renamingExam, movingExam, isUploadModalOpen, isFolderManagerOpen]);

  // Last-resort failsafe: whatever is slow (IndexedDB, a stalled listener), the
  // list must never be stuck behind a spinner.
  useEffect(() => {
    const failsafe = window.setTimeout(() => setLoading(false), 8000);
    return () => window.clearTimeout(failsafe);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadOfflineData = async () => {
      try {
        const localExams = await readWithTimeout(
          () => offlineStorage.getAllExams(),
          [],
          LOCAL_WRITE_TIMEOUT_MS,
          'Load device exams'
        );
        const localSessions = await readWithTimeout(
          () => offlineStorage.getAllSessions(currentUser?.uid || undefined),
          [],
          LOCAL_WRITE_TIMEOUT_MS,
          'Load device attempts'
        );
        
        if (!isMounted) return;

        const customLocalExams = localExams;

        setExams(prev => {
          const map = new Map<string, Exam>();
          applyExamMutations(customLocalExams).forEach(le => {
            map.set(le.id, {
              id: le.id,
              title: le.title,
              subject: le.subject,
              grade: le.grade || 'General',
              questions: le.questions,
              createdAt: le.createdAt
            });
          });
          prev.forEach(pe => map.set(pe.id, pe));
          const list = sortByRecency(Array.from(map.values()), (exam) => exam.createdAt, (exam) => exam.title);
          return sameOrNext(prev, list, examsSignature);
        });

        setUserExams(prev => {
          const map = new Map<string, UserExam>();
          localSessions.forEach(ls => {
            map.set(ls.id, {
              id: ls.id,
              examId: ls.examId,
              status: ls.status,
              answers: ls.answers,
              startTime: ls.startTime,
              timeLimit: ls.timeLimit,
              lastUpdated: ls.lastUpdated,
              // Kept so reopening a finished attempt can still show its score
              // and the time it took.
              score: ls.score,
              total: ls.total,
              percentage: ls.percentage,
              timeSpent: ls.timeSpent
            });
          });
          prev.forEach(pe => map.set(pe.id, pe));
          const list = sortByRecency(Array.from(map.values()), (session) => session.lastUpdated, (session) => session.id);
          return sameOrNext(prev, list, sessionsSignature);
        });
        setLoading(false);
      } catch (err) {
        console.warn("Offline data load error:", err);
        setLoading(false);
      }
    };

    loadOfflineData();

    // Only attach cloud Firestore listeners if the user is authenticated in Firebase Auth
    if (!currentUser || !isFirebaseAuthed || !auth.currentUser || auth.currentUser.uid !== currentUser.uid) {
      return () => {
        isMounted = false;
      };
    }

    let unsubscribeExams = () => {};
    let unsubscribeUserExams = () => {};

    try {
      const examsQuery = query(
        collection(db, 'exams'),
        where('createdBy', '==', currentUser.uid)
      );

      unsubscribeExams = onSnapshot(examsQuery, (snapshot) => {
        // Deleted-here-but-not-yet-in-the-cloud exams must not reappear, and a
        // pending rename must win over the cloud's older title.
        const cloudExams = applyExamMutations(
          snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Exam))
            .filter(doc => !isExamDeleted(doc.id))
        );
        setExams(prev => {
          const map = new Map<string, Exam>();
          prev.forEach(pe => map.set(pe.id, pe));
          cloudExams.forEach(ce => map.set(ce.id, ce));
          const list = sortByRecency(Array.from(map.values()), (exam) => exam.createdAt, (exam) => exam.title);
          return sameOrNext(prev, list, examsSignature);
        });
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'exams');
      });

      const userExamsQuery = query(
        collection(db, 'user_exams'),
        where('userId', '==', currentUser.uid)
      );

      unsubscribeUserExams = onSnapshot(userExamsQuery, (snapshot) => {
        const cloudUserExams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserExam));
        setUserExams(prev => {
          const map = new Map<string, UserExam>();
          prev.forEach(pe => map.set(pe.id, pe));
          cloudUserExams.forEach(ce => map.set(ce.id, ce));
          const list = sortByRecency(Array.from(map.values()), (session) => session.lastUpdated, (session) => session.id);
          return sameOrNext(prev, list, sessionsSignature);
        });
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'user_exams');
        setLoading(false);
      });
    } catch (err) {
      console.warn("Could not setup Firestore listeners in Home:", err);
    }

    return () => {
      isMounted = false;
      unsubscribeExams();
      unsubscribeUserExams();
    };
  }, [currentUser, isFirebaseAuthed]);

  const {
    subjects: folderSubjects,
    folders,
    addSubject,
    removeSubject,
    renameSubject,
  } = useSubjects();
  const SUBJECTS: string[] = ['All', ...folderSubjects];

  // How many exams each folder currently shows — the manager says so, so a
  // student can see what a rename or a delete will touch.
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    folderSubjects.forEach((folder) => {
      counts[folder] = 0;
    });
    exams.forEach((exam) => {
      const folder = folderForSubject(exam.subject, folderSubjects);
      counts[folder] = (counts[folder] || 0) + 1;
    });
    return counts;
  }, [exams, folderSubjects]);

  /**
   * Replays edits that never reached Firestore (rename, move, delete).
   *
   * Renaming or deleting offline used to be undone by the next cloud snapshot.
   * The edits are recorded in `examMutations` before the write is attempted and
   * replayed here — on mount and whenever the connection comes back — then
   * cleared once the backend confirms them.
   */
  useEffect(() => {
    if (!currentUser || !isFirebaseAuthed || !isOnline) return;
    if (!auth.currentUser || auth.currentUser.uid !== currentUser.uid) return;
    const pending = getExamMutations();
    if (pending.length === 0) return;

    let cancelled = false;
    const flush = async () => {
      for (const op of pending) {
        if (cancelled) return;
        try {
          if (op.type === 'delete') {
            // Remove its sessions first, exactly like an online delete.
            // Bounded: a stalled query here would block every later replay.
            await readWithTimeout(
              async () => {
                const sessionsSnapshot = await getDocs(
                  query(collection(db, 'user_exams'), where('userId', '==', currentUser.uid))
                );
                const orphaned = sessionsSnapshot.docs.filter(
                  sessionDoc => (sessionDoc.data()?.examId as string | undefined) === op.id
                );
                await Promise.all(orphaned.map(sessionDoc => deleteDoc(sessionDoc.ref)));
              },
              undefined,
              CLOUD_WRITE_TIMEOUT_MS,
              'Session cleanup during replay'
            );
            const confirmed = await runWithTimeout(
              () => deleteDoc(doc(db, 'exams', op.id)),
              CLOUD_WRITE_TIMEOUT_MS,
              'Delete exam (replay)'
            );
            if (confirmed) clearExamMutation(op.id);
          } else {
            const confirmed = await runWithTimeout(
              () => updateDoc(doc(db, 'exams', op.id), op.fields),
              CLOUD_WRITE_TIMEOUT_MS,
              'Update exam (replay)'
            );
            if (confirmed) clearExamMutation(op.id);
          }
        } catch (error: any) {
          // The document is gone or no longer ours: retrying can never succeed.
          const code = error?.code;
          if (code === 'not-found' || code === 'permission-denied' || code === 'invalid-argument') {
            clearExamMutation(op.id);
          } else {
            console.warn('Could not replay an exam edit; it will retry later:', error);
          }
        }
      }
    };

    void flush();
    return () => {
      cancelled = true;
    };
  }, [currentUser, isFirebaseAuthed, isOnline]);

  /**
   * True when this exam exists in the cloud and this session may write to it.
   * Local-only exams (`local_…`) and guests never produce pending mutations, so
   * the queue cannot fill up with edits that can never be replayed.
   */
  const canWriteCloud = (examId?: string | null): boolean =>
    Boolean(
      examId &&
        !examId.startsWith('local_') &&
        currentUser &&
        isFirebaseAuthed &&
        auth.currentUser &&
        auth.currentUser.uid === currentUser.uid
    );

  // A folder that disappears (deleted here or in another tab) must not leave
  // the list filtered on a chip that no longer exists.
  useEffect(() => {
    if (selectedSubject === 'All') return;
    if (!folderSubjects.includes(selectedSubject)) setSelectedSubject('All');
  }, [folderSubjects, selectedSubject]);

  const handleRenameFolder = (name: string, next: string) => {
    const result = renameSubject(name, next);
    // Follow the rename instead of dropping the student out of the folder.
    if (result.ok && selectedSubject === name) setSelectedSubject(result.name || next);
    return result;
  };

  const handleRemoveFolder = (name: string) => {
    removeSubject(name);
    if (selectedSubject === name) setSelectedSubject('All');
  };
  const getSubjectName = (subj: string) => subjectDisplayName(subj, t);
  const getGradeName = (grd?: string) => t(gradeLabelKey(grd));

  /**
   * The newest attempt per exam, computed once per change of the attempt list.
   * The card used to filter the whole attempt array for every exam on every
   * render, which is what made a large library feel sluggish.
   */
  const latestSessionByExam = useMemo(() => {
    const map = new Map<string, UserExam>();
    for (const session of userExams) {
      const existing = map.get(session.examId);
      if (!existing || toMillis(session.lastUpdated) > toMillis(existing.lastUpdated)) {
        map.set(session.examId, session);
      }
    }
    return map;
  }, [userExams]);

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase());
      // Folders are mutually exclusive: choosing "General" shows the papers
      // that belong to no other folder, never a second copy of everything.
      const subjectOk =
        selectedSubject === 'All' || folderForSubject(exam.subject, folderSubjects) === selectedSubject;
      return matchesSearch && subjectOk;
    });
  }, [exams, searchQuery, selectedSubject, folderSubjects]);

  const handleRenameExam = (exam: Exam) => {
    setRenamingExam(exam);
    setNewTitle(exam.title);
  };

  const handleMoveExam = (exam: any) => {
    setMovingExam(exam);
    setNewSubject(folderForSubject(exam.subject, folderSubjects));
  };

  const confirmRename = async () => {
    if (!renamingExam || !newTitle.trim()) return;
    setIsUpdating(true);
    const updatedTitle = newTitle.trim();
    const path = `exams/${renamingExam.id}`;
    try {
      // The device copy is the source of truth for what the student just did;
      // it is written first so an unreachable backend cannot swallow the edit.
      const cached = await readWithTimeout(
        () => offlineStorage.getExamById(renamingExam.id),
        null,
        LOCAL_WRITE_TIMEOUT_MS,
        'Rename exam (local read)'
      );
      if (cached) {
        await runWithTimeout(
          () => offlineStorage.saveExam({ ...cached, title: updatedTitle }),
          LOCAL_WRITE_TIMEOUT_MS,
          'Rename exam (local)'
        );
      }
      setExams(prev => prev.map(e => e.id === renamingExam.id ? { ...e, title: updatedTitle } : e));
      if (canWriteCloud(renamingExam.id)) {
        const id = renamingExam.id;
        queueExamUpdate(id, { title: updatedTitle });
        void runWithTimeout(
          () => updateDoc(doc(db, 'exams', id), { title: updatedTitle }),
          CLOUD_WRITE_TIMEOUT_MS,
          'Rename exam (cloud)'
        )
          .then(confirmed => {
            if (confirmed) clearExamMutation(id);
          })
          .catch(() => {
            // Kept pending: it replays on the next start or reconnect.
          });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setRenamingExam(null);
      setIsUpdating(false);
    }
  };

  const confirmMove = async () => {
    if (!movingExam || !newSubject) return;
    setIsUpdating(true);
    const path = `exams/${movingExam.id}`;
    const movingId = movingExam.id;
    const targetSubject = newSubject;
    try {
      const cached = await readWithTimeout(
        () => offlineStorage.getExamById(movingId),
        null,
        LOCAL_WRITE_TIMEOUT_MS,
        'Move exam (local read)'
      );
      if (cached) {
        await runWithTimeout(
          () => offlineStorage.saveExam({ ...cached, subject: targetSubject }),
          LOCAL_WRITE_TIMEOUT_MS,
          'Move exam (local)'
        );
      }
      setExams(prev => prev.map(e => e.id === movingId ? { ...e, subject: targetSubject } : e));
      if (canWriteCloud(movingId)) {
        queueExamUpdate(movingId, { subject: targetSubject });
        void runWithTimeout(
          () => updateDoc(doc(db, 'exams', movingId), { subject: targetSubject }),
          CLOUD_WRITE_TIMEOUT_MS,
          'Move exam (cloud)'
        )
          .then(confirmed => {
            if (confirmed) clearExamMutation(movingId);
          })
          .catch(() => {
            // Kept pending for the next sync.
          });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setMovingExam(null);
      setIsUpdating(false);
    }
  };

  /**
   * Deletes one paper.
   *
   * The device copy is removed first, so the click always takes effect even
   * with no connection. The cloud work is then deliberately *not* awaited: this
   * used to run a `user_exams` collection query before the `deleteDoc`, and on a
   * slow or offline connection that query never settled — the dialog sat on
   * "deleting…" forever. The pending delete is recorded before the write, so a
   * failure replays later instead of the paper coming back.
   */
  const confirmDeleteExam = async () => {
    if (!deletingExamId) return;
    const targetId = deletingExamId;
    setIsDeleting(true);

    try {
      await runWithTimeout(
        () => offlineStorage.deleteExamCascade(targetId),
        LOCAL_WRITE_TIMEOUT_MS,
        'Delete exam (local)'
      );
      // Any unsent work for this paper dies with it, otherwise the attempt's
      // queued save would upload an orphaned result on the next reconnect.
      await runWithTimeout(
        () => offlineStorage.clearSyncQueueForExam(targetId),
        LOCAL_WRITE_TIMEOUT_MS,
        'Clear queued sync for the deleted exam'
      );
      // A deleted paper must not come back on the next refresh.
      forgetActiveExam(targetId);

      setExams(prev => prev.filter(exam => exam.id !== targetId));
      setUserExams(prev => prev.filter(session => session.examId !== targetId));

      // The student's part is done: close the dialog now.
      setDeletingExamId(null);

      if (canWriteCloud(targetId) && currentUser) {
        queueExamDelete(targetId);
        void deleteExamInCloud(targetId, currentUser.uid);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `exams/${targetId}`);
      setDeletingExamId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Best-effort cloud half of a delete: its attempts first, then the paper.
   * Every step is bounded, so a stalled network can only delay a replay.
   */
  const deleteExamInCloud = async (examId: string, uid: string) => {
    await runWithTimeout(
      async () => {
        // Single-field query on purpose: `where('examId') + where('userId')`
        // needs a composite index, and without it the cleanup silently failed
        // and left orphaned results behind.
        const sessionsSnapshot = await getDocs(
          query(collection(db, 'user_exams'), where('userId', '==', uid))
        );
        const orphaned = sessionsSnapshot.docs.filter(
          sessionDoc => (sessionDoc.data()?.examId as string | undefined) === examId
        );
        await Promise.all(orphaned.map(sessionDoc => deleteDoc(sessionDoc.ref)));
      },
      CLOUD_WRITE_TIMEOUT_MS,
      'Delete exam attempts (cloud)'
    );

    const confirmed = await runWithTimeout(
      () => deleteDoc(doc(db, 'exams', examId)),
      CLOUD_WRITE_TIMEOUT_MS,
      'Delete exam (cloud)'
    );
    // Only a confirmed delete clears the tombstone; otherwise it replays.
    if (confirmed) clearExamMutation(examId);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
      {/* Page header: the library now lives on "My Exams" */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)] tracking-tight">
            {t('myExamsTitle')}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t('myExamsSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setUploadModalDefaultTab('paste');
              setIsUploadModalOpen(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-sm hover:bg-white/10 transition-all"
          >
            <Type className="w-4 h-4 text-[#8AB4F8]" />
            {t('pasteQuestions')}
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadModalDefaultTab('upload');
              setIsUploadModalOpen(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8AB4F8] text-gray-900 font-bold text-sm hover:bg-[#AECBFA] transition-all shadow-md"
          >
            <Upload className="w-4 h-4" />
            {t('uploadNewExam')}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-6">
          {/* Search */}
          <div className="flex items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder={t('searchYourExams')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3.5 pl-12 pr-11 text-[var(--text-primary)] placeholder:text-gray-600 focus:outline-none focus:border-[#8AB4F8] transition-all text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t('clearSearch')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {SUBJECTS.map(subject => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                aria-pressed={selectedSubject === subject}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedSubject === subject
                    ? 'bg-[#8AB4F8] text-gray-900'
                    : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
                }`}
              >
                {subject === 'All' ? t('allExams') : getSubjectName(subject)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsFolderManagerOpen(true)}
              title={t('manageFolders')}
              aria-label={t('manageFolders')}
              className="ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-[var(--text-secondary)] bg-white/5 hover:bg-white/10 transition-all"
            >
              <FolderCog className="w-4 h-4" />
              <span className="hidden sm:inline">{t('manageFolders')}</span>
            </button>
          </div>

          {/* Exam List */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 animate-pulse"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-11 h-11 rounded-2xl bg-white/5" />
                    <div className="w-16 h-5 rounded-full bg-white/5" />
                  </div>
                  <div className="h-4 w-3/4 rounded bg-white/5 mb-2.5" />
                  <div className="h-3 w-1/2 rounded bg-white/5 mb-6" />
                  <div className="h-9 w-24 rounded-xl bg-white/5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.length > 0 ? (
                filteredExams.map((exam) => {
                  const latestSession = latestSessionByExam.get(exam.id);

                  return (
                    <motion.div 
                      key={exam.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 hover:border-gray-700 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="bg-[#8AB4F8]/10 p-3 rounded-2xl">
                          <FileText className="w-6 h-6 text-[#8AB4F8]" />
                        </div>
                        <div className="flex items-center gap-1">
                          <ExportExamButton exam={exam} />
                          <button 
                            onClick={() => handleRenameExam(exam)}
                            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            title={t('renameLabel')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleMoveExam(exam)}
                            className="p-2 text-[var(--text-secondary)] hover:text-[#8AB4F8] transition-colors"
                            title={t('moveToFolder')}
                          >
                            <FolderOpen className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeletingExamId(exam.id)}
                            className="p-2 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5 line-clamp-2 leading-snug">{exam.title}</h3>
                      <p className="text-[11px] text-[var(--text-secondary)] mb-4 uppercase tracking-widest font-bold">
                        {getSubjectName(folderForSubject(exam.subject, folderSubjects))}
                        {exam.grade && exam.grade !== 'General' && ` • ${getGradeName(exam.grade)}`}
                        {` • ${t('questionCountLabel', { count: exam.questions?.length || 0 })}`}
                      </p>

                      <div className="flex items-center justify-between pt-5 border-t border-white/5 gap-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-1">{t('status')}</span>
                          {latestSession ? (
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${
                              latestSession.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {latestSession.status === 'COMPLETED' ? t('statusCompleted') : t('statusInProgress')}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">{t('newStatus')}</span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {latestSession?.status === 'IN_PROGRESS' ? (
                            <button 
                              onClick={() => onContinue(exam, latestSession)}
                              className="bg-[#8AB4F8] text-gray-900 px-6 py-2 rounded-xl text-xs font-bold hover:bg-[#AECBFA] transition-all"
                            >
                              {t('continueText')}
                            </button>
                          ) : latestSession?.status === 'COMPLETED' ? (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => onViewSummary(exam, latestSession)}
                                className="bg-white/5 text-[var(--text-primary)] px-6 py-2 rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
                              >
                                {t('results')}
                              </button>
                              <button 
                                onClick={() => onRetake(exam)}
                                className="bg-[#8AB4F8] text-gray-900 px-6 py-2 rounded-xl text-xs font-bold hover:bg-[#AECBFA] transition-all"
                              >
                                {t('retake')}
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => onRetake(exam)}
                              className="bg-[#8AB4F8] text-gray-900 px-6 py-2 rounded-xl text-xs font-bold hover:bg-[#AECBFA] transition-all"
                            >
                              {t('start')}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full py-16 sm:py-20 px-6 text-center bg-[var(--bg-secondary)] border border-dashed border-[var(--border-color)] rounded-[40px]">
                  <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[#8AB4F8]/10 text-[#8AB4F8] flex items-center justify-center">
                    <FileText className="w-7 h-7" />
                  </div>
                  <p className="text-[var(--text-primary)] font-bold mb-1.5">
                    {searchQuery
                      ? t('noSearchResults')
                      : selectedSubject !== 'All'
                        ? t('noExamsInFolder')
                        : t('noExamsYetTitle')}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto leading-relaxed">
                    {searchQuery
                      ? t('noSearchResultsDesc')
                      : selectedSubject !== 'All'
                        ? t('noExamsInFolderDesc')
                        : t('noExamsYetDesc')}
                  </p>
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-[#8AB4F8] font-bold hover:underline"
                    >
                      {t('clearSearch')}
                    </button>
                  ) : selectedSubject !== 'All' ? (
                    <button
                      type="button"
                      onClick={() => setSelectedSubject('All')}
                      className="text-[#8AB4F8] font-bold hover:underline"
                    >
                      {t('showAllExams')}
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadModalDefaultTab('upload');
                          setIsUploadModalOpen(true);
                        }}
                        className="w-full sm:w-auto bg-[#8AB4F8] text-gray-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#AECBFA] transition-all"
                      >
                        {t('uploadNewExam')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadModalDefaultTab('paste');
                          setIsUploadModalOpen(true);
                        }}
                        className="w-full sm:w-auto bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-white/10 transition-all"
                      >
                        {t('pasteQuestions')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {deletingExamId && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingExamId(null)} className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 sm:p-8 rounded-[32px] max-w-sm w-full shadow-2xl my-auto max-h-[85vh] overflow-y-auto">
              <div className="bg-red-400/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('deleteExamTitle')}</h3>
              <p className="text-[var(--text-secondary)] mb-8">{t('deleteExamConfirm')}</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingExamId(null)} className="flex-1 bg-white/5 text-[var(--text-primary)] py-3 rounded-xl font-bold hover:bg-white/10 transition-all">{t('cancel')}</button>
                <button onClick={confirmDeleteExam} disabled={isDeleting} className="flex-1 bg-red-400 text-white py-3 rounded-xl font-bold hover:bg-red-500 transition-all flex items-center justify-center gap-2">
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {renamingExam && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRenamingExam(null)} className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 sm:p-8 rounded-[32px] max-w-md w-full shadow-2xl my-auto max-h-[85vh] overflow-y-auto">
              <div className="bg-[#8AB4F8]/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <Edit2 className="w-6 h-6 text-[#8AB4F8]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('renameExamTitle')}</h3>
              <p className="text-[var(--text-secondary)] mb-6">{t('renameExamPrompt')}</p>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-gray-600 focus:outline-none focus:border-[#8AB4F8] transition-colors mb-8" placeholder={t('examTitlePlaceholder')} autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setRenamingExam(null)} className="flex-1 bg-white/5 text-[var(--text-primary)] py-3 rounded-xl font-bold hover:bg-white/10 transition-all">{t('cancel')}</button>
                <button onClick={confirmRename} disabled={isUpdating || !newTitle.trim()} className="flex-1 bg-[#8AB4F8] text-gray-900 py-3 rounded-xl font-bold hover:bg-[#AECBFA] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('saveChanges')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {movingExam && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMovingExam(null)} className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 sm:p-8 rounded-[32px] max-w-md w-full shadow-2xl my-auto max-h-[85vh] overflow-y-auto">
              <div className="bg-[#8AB4F8]/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <FolderOpen className="w-6 h-6 text-[#8AB4F8]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('moveExamTitle')}</h3>
              <p className="text-[var(--text-secondary)] mb-6">{t('selectNewFolder')} — "{movingExam.title}"</p>
              
              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 block">{t('subjectLabel')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SUBJECTS.filter(s => s !== 'All').map(subject => (
                      <button
                        key={subject}
                        onClick={() => setNewSubject(subject)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          newSubject === subject 
                            ? 'bg-[#8AB4F8] text-gray-900 border-[#8AB4F8]' 
                            : 'bg-[var(--bg-accent)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-gray-600'
                        }`}
                      >
                        {getSubjectName(subject)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setMovingExam(null)} className="flex-1 bg-white/5 text-[var(--text-primary)] py-3 rounded-xl font-bold hover:bg-white/10 transition-all">{t('cancel')}</button>
                <button onClick={confirmMove} disabled={isUpdating || !newSubject} className="flex-1 bg-[#8AB4F8] text-gray-900 py-3 rounded-xl font-bold hover:bg-[#AECBFA] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('move')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFolderManagerOpen && (
          <FolderManager
            isOpen={isFolderManagerOpen}
            onClose={() => setIsFolderManagerOpen(false)}
            folders={folders}
            counts={folderCounts}
            onAdd={addSubject}
            onRename={handleRenameFolder}
            onRemove={handleRemoveFolder}
          />
        )}
      </AnimatePresence>

      {/* Exam Upload Modal */}
      {onUpload && onProcessText && (
        <SectionBoundary resetKey={isUploadModalOpen}>
          <ExamUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onUpload={onUpload}
            onProcessText={onProcessText}
            onImportExam={onImportExam}
            isParsing={isParsing}
            defaultTab={uploadModalDefaultTab}
          />
        </SectionBoundary>
      )}
    </div>
  );
}
