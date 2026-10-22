import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Timer, CheckCircle2, Play, Trash2, Clock, Plus, Loader2, Key, AlertCircle, Edit2, Search, ChevronDown, FolderOpen, ChevronRight, Upload } from 'lucide-react';
import ExamUploadModal from './ExamUploadModal';
import type { ImportedExam } from '../lib/examSchema';
import { offlineStorage } from '../lib/offlineStorage';
import { GRADES, gradeLabelKey, subjectDisplayName } from '../lib/subjects';
import { useSubjects, subjectMatchesFolder } from '../lib/subjectStore';

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

export default function Dashboard({ onContinue, onRetake, onViewSummary, onSelectSubject, onUpload, onProcessText, onImportExam, isParsing }: DashboardProps) {
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
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [renamingExam, setRenamingExam] = useState<Exam | null>(null);
  const [movingExam, setMovingExam] = useState<Exam | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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
      // Known subject → its own folder; anything else lands in General.
      const folder =
        folderSubjects.find((sub) => sub !== 'General' && subjectMatchesFolder(exam.subject, sub)) ||
        'General';
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
    try {
      if (currentUser && isFirebaseAuthed && auth.currentUser && auth.currentUser.uid === currentUser.uid && !deleteConfirmId.startsWith('guest-') && !deleteConfirmId.startsWith('local_')) {
        await deleteDoc(doc(db, 'user_exams', deleteConfirmId));
      }
      try {
        await offlineStorage.deleteSession(deleteConfirmId);
      } catch (err) {
        console.warn("Local session delete notice:", err);
      }
      setUserExams(prev => prev.filter(s => s.id !== deleteConfirmId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setDeleteConfirmId(null);
      setIsDeleting(false);
    }
  };

  const handleRenameExam = (exam: Exam) => {
    setRenamingExam(exam);
    setNewTitle(exam.title);
  };

  const handleMoveExam = (exam: any) => {
    setMovingExam(exam);
    setNewSubject(exam.subject);
  };

  const confirmRename = async () => {
    if (!renamingExam || !newTitle.trim()) return;
    setIsUpdating(true);
    const updatedTitle = newTitle.trim();
    const path = `exams/${renamingExam.id}`;
    try {
      if (currentUser && isFirebaseAuthed && auth.currentUser && auth.currentUser.uid === currentUser.uid && !renamingExam.id.startsWith('local_')) {
        await updateDoc(doc(db, 'exams', renamingExam.id), {
          title: updatedTitle
        });
      }
      // Also update in offline storage
      const cached = await offlineStorage.getExamById(renamingExam.id);
      if (cached) {
        await offlineStorage.saveExam({ ...cached, title: updatedTitle });
      }
      setExams(prev => prev.map(e => e.id === renamingExam.id ? { ...e, title: updatedTitle } : e));
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
    try {
      if (currentUser && isFirebaseAuthed && auth.currentUser && auth.currentUser.uid === currentUser.uid && !movingExam.id.startsWith('local_')) {
        await updateDoc(doc(db, 'exams', movingExam.id), {
          subject: newSubject,
        });
      }
      // Also update in offline storage
      const cached = await offlineStorage.getExamById(movingExam.id);
      if (cached) {
        await offlineStorage.saveExam({ ...cached, subject: newSubject });
      }
      setExams(prev => prev.map(e => e.id === movingExam.id ? { ...e, subject: newSubject } : e));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setMovingExam(null);
      setIsUpdating(false);
    }
  };

  const handleDeleteExam = (examId: string) => {
    setDeletingExamId(examId);
  };

  const confirmDeleteExam = async () => {
    if (!deletingExamId) return;
    setIsDeleting(true);
    const path = `exams/${deletingExamId}`;
    try {
      // 1. Delete from local/offline storage
      try {
        await offlineStorage.deleteExam(deletingExamId);
      } catch (offErr) {
        console.warn("Could not delete from offline storage:", offErr);
      }

      // 2. Delete from Firestore if authenticated
      if (currentUser && isFirebaseAuthed && auth.currentUser && auth.currentUser.uid === currentUser.uid && !deletingExamId.startsWith('local_')) {
        try {
          const sessionsPath = 'user_exams';
          const sessionsQuery = query(
            collection(db, sessionsPath),
            where('examId', '==', deletingExamId),
            where('userId', '==', currentUser.uid)
          );
          const sessionsSnapshot = await getDocs(sessionsQuery);
          const deletePromises = sessionsSnapshot.docs.map(sessionDoc => deleteDoc(sessionDoc.ref));
          await Promise.all(deletePromises);
        } catch (sessionErr) {
          console.warn("User sessions cleanup notice:", sessionErr);
        }
        await deleteDoc(doc(db, 'exams', deletingExamId));
      }
      setExams(prev => prev.filter(e => e.id !== deletingExamId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setDeletingExamId(null);
      setIsDeleting(false);
    }
  };

  const getSubjectName = (subj: string) => subjectDisplayName(subj, t);
  const getGradeName = (grd: string) => t(gradeLabelKey(grd));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#8AB4F8] animate-spin" />
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
                      {isPracticeOnly ? t('practiceModeLabel') : `${score}/${total} · ${percentage}%`}
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject Folders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {folderSubjects.map((subject) => {
          const subjectExams = examsBySubject[subject] ?? [];

          return (
            <div key={subject} className="flex flex-col gap-4">
              <button 
                onClick={() => onSelectSubject(subject)}
                className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-3xl hover:border-gray-700 transition-all text-left flex items-center justify-between group`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors bg-white/5 group-hover:bg-white/10`}>
                    <FolderOpen className={`w-6 h-6 text-[var(--text-secondary)]`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{getSubjectName(subject)}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{t('examsAvailable', { count: subjectExams.length })}</p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-gray-600 group-hover:text-[#8AB4F8] transition-all`} />
              </button>
            </div>
          );
        })}
      </div>

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

        {deletingExamId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingExamId(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-3xl max-w-sm w-full shadow-2xl">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRenamingExam(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-3xl max-w-md w-full shadow-2xl">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMovingExam(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-3xl max-w-md w-full shadow-2xl">
              <div className="bg-[#8AB4F8]/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <FolderOpen className="w-6 h-6 text-[#8AB4F8]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('moveExamTitle')}</h3>
              <p className="text-[var(--text-secondary)] mb-6">Select a new folder for "{movingExam.title}".</p>
              
              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 block">1. Select Subject</label>
                  <div className="grid grid-cols-2 gap-2">
                    {folderSubjects.map(subject => (
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
