import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Loader2, Search, FolderOpen, ChevronRight, Upload } from 'lucide-react';
import ExamUploadModal from './ExamUploadModal';
import type { ImportedExam } from '../lib/examSchema';
import { offlineStorage } from '../lib/offlineStorage';
import { subjectDisplayName } from '../lib/subjects';
import { useSubjects, folderForSubject } from '../lib/subjectStore';
import { runWithTimeout, LOCAL_WRITE_TIMEOUT_MS, CLOUD_WRITE_TIMEOUT_MS } from '../lib/cloudWrite';

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
  lastUpdated: any;
}

interface DashboardProps {
  onContinue: (exam: Exam, session: UserExam) => void;
  onRetake: (exam: Exam) => void;
  onViewSummary: (exam: Exam, session: UserExam) => void;
  onSelectSubject: (subject: string) => void;
  onUpload?: (file: File, subject: string, grade: string) => Promise<void>;
  onProcessText?: (text: string, subject: string, grade: string) => Promise<void>;
  onImportExam?: (exam: ImportedExam) => Promise<void>;
  isParsing?: boolean;
  key?: string;
}

export default function Dashboard({ onViewSummary, onSelectSubject, onUpload, onProcessText, onImportExam, isParsing }: DashboardProps) {
  const { currentUser, isFirebaseAuthed } = useAuth();
  const { t } = useLanguage();
  const [exams, setExams] = useState<Exam[]>([]);
  const [userExams, setUserExams] = useState<UserExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { subjects: folderSubjects } = useSubjects();
  
  // Modals state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        const localExams = await offlineStorage.getAllExams();
        const localSessions = await offlineStorage.getAllSessions(currentUser?.uid || undefined);
        
        if (!isMounted) return;

        const customLocalExams = localExams;

        setExams(prev => {
          const map = new Map<string, Exam>();
          customLocalExams.forEach(le => {
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
          const list = Array.from(map.values());
          list.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
            return timeB - timeA;
          });
          return list;
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
              lastUpdated: ls.lastUpdated
            });
          });
          prev.forEach(pe => map.set(pe.id, pe));
          const list = Array.from(map.values());
          list.sort((a, b) => {
            const timeA = a.lastUpdated?.toMillis ? a.lastUpdated.toMillis() : (a.lastUpdated || 0);
            const timeB = b.lastUpdated?.toMillis ? b.lastUpdated.toMillis() : (b.lastUpdated || 0);
            return timeB - timeA;
          });
          return list;
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
        const cloudExams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
        setExams(prev => {
          const map = new Map<string, Exam>();
          prev.forEach(pe => map.set(pe.id, pe));
          cloudExams.forEach(ce => map.set(ce.id, ce));
          const list = Array.from(map.values());
          list.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
            return timeB - timeA;
          });
          return list;
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
          const list = Array.from(map.values());
          list.sort((a, b) => {
            const timeA = a.lastUpdated?.toMillis ? a.lastUpdated.toMillis() : (a.lastUpdated || 0);
            const timeB = b.lastUpdated?.toMillis ? b.lastUpdated.toMillis() : (b.lastUpdated || 0);
            return timeB - timeA;
          });
          return list;
        });
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'user_exams');
        setLoading(false);
      });
    } catch (err) {
      console.warn("Could not setup Firestore listeners:", err);
    }

    return () => {
      isMounted = false;
      unsubscribeExams();
      unsubscribeUserExams();
    };
  }, [currentUser, isFirebaseAuthed]);

  const filteredExams = useMemo(() => {
    return exams.filter(exam => 
      exam.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [exams, searchQuery]);

  const examsBySubject = useMemo(() => {
    const map: Record<string, Exam[]> = {};
    folderSubjects.forEach(sub => map[sub] = []);
    filteredExams.forEach(exam => {
      const folder = folderForSubject(exam.subject, folderSubjects);
      if (map[folder]) map[folder].push(exam);
      else map[folder] = [exam];
    });
    return map;
  }, [filteredExams, folderSubjects]);

  const recentResults = useMemo(() => {
    return userExams
      .filter(session => session.status === 'COMPLETED')
      .slice(0, 6)
      .map(session => ({
        session,
        exam: exams.find(e => e.id === session.examId),
      }))
      .filter(item => Boolean(item.exam));
  }, [userExams, exams]);

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    const path = `user_exams/${deleteConfirmId}`;
    const sessionId = deleteConfirmId;
    try {
      // Local first: the row disappears at once even if the cloud is down.
      await runWithTimeout(
        () => offlineStorage.deleteSession(sessionId),
        LOCAL_WRITE_TIMEOUT_MS,
        'Delete result (local)'
      );
      setUserExams(prev => prev.filter(s => s.id !== sessionId));
      if (currentUser && isFirebaseAuthed && auth.currentUser && auth.currentUser.uid === currentUser.uid && !sessionId.startsWith('guest-') && !sessionId.startsWith('local_')) {
        void runWithTimeout(
          () => deleteDoc(doc(db, 'user_exams', sessionId)),
          CLOUD_WRITE_TIMEOUT_MS,
          'Delete result (cloud)'
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setDeleteConfirmId(null);
      setIsDeleting(false);
    }
  };


  // Folders that hold papers come first: an empty folder should never push a
  // folder you actually use below the fold.
  const orderedFolders = useMemo(() => {
    const count = (folder: string) => (examsBySubject[folder] ?? []).length;
    return [...folderSubjects].sort((a, b) => count(b) - count(a));
  }, [folderSubjects, examsBySubject]);

  const getSubjectName = (subj: string) => subjectDisplayName(subj, t);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12" aria-busy="true">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-8 md:p-12 mb-10 animate-pulse">
          <div className="h-7 w-64 max-w-full rounded bg-white/5 mb-3" />
          <div className="h-4 w-80 max-w-full rounded bg-white/5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 flex items-center gap-3.5 animate-pulse"
            >
              <div className="w-11 h-11 rounded-xl bg-white/5 shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-2/3 rounded bg-white/5 mb-2" />
                <div className="h-3 w-1/3 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      {/* Hero Section */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-8 md:p-12 mb-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#8AB4F8] opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#8AB4F8] opacity-5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className="flex-1 w-full text-left relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">{t('dashWelcome')}</h1>
          <p className="text-base md:text-lg text-[var(--text-secondary)]">{t('dashSubtitle')}</p>
        </div>
        
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3 relative z-10 shrink-0">
          <div className="relative shadow-sm w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input 
              type="text"
              placeholder={t('searchYourExams')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl py-3 pl-11 pr-5 text-[var(--text-primary)] placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#8AB4F8]/50 focus:border-[#8AB4F8] transition-all text-sm"
            />
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full sm:w-auto bg-[#8AB4F8] text-gray-900 px-5 py-3 rounded-2xl font-bold hover:bg-[#AECBFA] transition-all flex items-center justify-center gap-2 text-sm shadow-md whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            {t('uploadNewExam')}
          </button>
        </div>
      </div>

      {/* Recent results */}
      {recentResults.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-[var(--text-primary)]">{t('recentActivity')}</h2>
            <span className="text-xs text-[var(--text-secondary)]">{recentResults.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentResults.map(({ session, exam }) => {
              const total = session.total ?? (exam!.questions?.length || 0);
              const score = session.score ?? 0;
              const percentage = session.percentage ?? (total > 0 ? Math.round((score / total) * 100) : 0);
              const isPracticeOnly = total === 0;
              return (
                <div key={session.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{exam!.title}</p>
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] mt-1">
                      {isPracticeOnly ? t('practiceModeLabel') : `${score}/${total}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isPracticeOnly && (
                      <span className={`text-sm font-black ${percentage >= 50 ? 'text-emerald-500' : 'text-red-500'}`}>{percentage}%</span>
                    )}
                    <button
                      onClick={() => onViewSummary(exam!, session)}
                      className="px-3 py-2 rounded-xl bg-[var(--bg-accent)] border border-[var(--border-color)] text-[11px] font-bold text-[var(--text-primary)] hover:bg-[var(--card-hover)] transition-colors"
                    >
                      {t('results')}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(session.id)}
                      aria-label={t('delete')}
                      title={t('delete')}
                      className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject Folders Grid */}
      {exams.length === 0 ? (
        <div className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border-color)] rounded-3xl p-10 md:p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#8AB4F8]/10 text-[#8AB4F8] flex items-center justify-center mx-auto mb-5">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1.5">{t('startFirstExam')}</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">{t('startFirstExamDesc')}</p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-[#8AB4F8] text-gray-900 px-6 py-3 rounded-2xl font-bold hover:bg-[#AECBFA] transition-all inline-flex items-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" />
            {t('uploadNewExam')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orderedFolders.map((subject) => {
            const subjectExams = examsBySubject[subject] ?? [];
            const isEmpty = subjectExams.length === 0;

            return (
              <button
                key={subject}
                onClick={() => onSelectSubject(subject)}
                aria-label={`${getSubjectName(subject)} — ${t('examsAvailable', { count: subjectExams.length })}`}
                className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5 rounded-2xl transition-all text-left flex items-center justify-between gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4F8]/60 ${
                  isEmpty ? 'opacity-65 hover:opacity-100 hover:border-[var(--border-color)]' : 'hover:border-[#8AB4F8]/50 hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors bg-white/5 group-hover:bg-[#8AB4F8]/10 shrink-0">
                    <FolderOpen className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[#8AB4F8] transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[var(--text-primary)] truncate">{getSubjectName(subject)}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">{t('examsAvailable', { count: subjectExams.length })}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#8AB4F8] transition-all shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirmId(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-3xl max-w-sm w-full shadow-2xl">
              <div className="bg-red-400/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('deleteSessionTitle')}</h3>
              <p className="text-[var(--text-secondary)] mb-8">{t('deleteSessionConfirm')}</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 bg-white/5 text-[var(--text-primary)] py-3 rounded-xl font-bold hover:bg-white/10 transition-all">{t('cancel')}</button>
                <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 bg-red-400 text-white py-3 rounded-xl font-bold hover:bg-red-500 transition-all flex items-center justify-center gap-2">
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exam Upload Modal */}
      {onUpload && onProcessText && (
        <ExamUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUpload={onUpload}
          onProcessText={onProcessText}
          onImportExam={onImportExam}
          isParsing={isParsing}
        />
      )}
    </div>
  );
}
