import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Trash2, Edit2, Loader2, Search, CheckCircle2, FolderOpen, Upload, Type } from 'lucide-react';
import ExamUploadModal from './ExamUploadModal';
import ExportExamButton from './ExportExamButton';
import type { ImportedExam } from '../lib/examSchema';

import { offlineStorage } from '../lib/offlineStorage';
import { SUBJECTS as CANONICAL_SUBJECTS, GRADES, matchesSubject, subjectLabelKey, gradeLabelKey } from '../lib/subjects';

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

interface HomeProps {
  onContinue: (exam: Exam, session: UserExam) => void;
  onRetake: (exam: Exam) => void;
  onViewSummary: (exam: Exam, session: UserExam) => void;
  onUpload?: (file: File, subject: string, grade: string) => Promise<void>;
  onProcessText?: (text: string, subject: string, grade: string) => Promise<void>;
  onImportExam?: (exam: ImportedExam) => Promise<void>;
  isParsing?: boolean;
}

const SUBJECTS: string[] = ['All', ...CANONICAL_SUBJECTS];

export default function Home({ onContinue, onRetake, onViewSummary, onUpload, onProcessText, onImportExam, isParsing }: HomeProps) {
  const { currentUser, isFirebaseAuthed } = useAuth();
  const { t } = useLanguage();
  const [exams, setExams] = useState<Exam[]>([]);
  const [userExams, setUserExams] = useState<UserExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadModalDefaultTab, setUploadModalDefaultTab] = useState<'upload' | 'paste'>('upload');
  
  // Modals state
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [renamingExam, setRenamingExam] = useState<Exam | null>(null);
  const [movingExam, setMovingExam] = useState<Exam | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (deletingExamId || renamingExam || movingExam || isUploadModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [deletingExamId, renamingExam, movingExam, isUploadModalOpen]);

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
      console.warn("Could not setup Firestore listeners in Home:", err);
    }

    return () => {
      isMounted = false;
      unsubscribeExams();
      unsubscribeUserExams();
    };
  }, [currentUser, isFirebaseAuthed]);

  const getSubjectName = (subj: string) => t(subjectLabelKey(subj));
  const getGradeName = (grd?: string) => t(gradeLabelKey(grd));

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase());
      const subjectOk = selectedSubject === 'All' || matchesSubject(exam.subject, selectedSubject);
      return matchesSearch && subjectOk;
    });
  }, [exams, searchQuery, selectedSubject]);

  const handleRenameExam = (exam: Exam) => {
    setRenamingExam(exam);
    setNewTitle(exam.title);
  };

  const handleMoveExam = (exam: any) => {
    setMovingExam(exam);
    setNewSubject(exam.subject);
    setNewGrade(exam.grade || 'General');
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
    if (!movingExam || !newSubject || !newGrade) return;
    setIsUpdating(true);
    const path = `exams/${movingExam.id}`;
    try {
      if (currentUser && isFirebaseAuthed && auth.currentUser && auth.currentUser.uid === currentUser.uid && !movingExam.id.startsWith('local_')) {
        await updateDoc(doc(db, 'exams', movingExam.id), {
          subject: newSubject,
          grade: newGrade
        });
      }
      const cached = await offlineStorage.getExamById(movingExam.id);
      if (cached) {
        await offlineStorage.saveExam({ ...cached, subject: newSubject, grade: newGrade });
      }
      setExams(prev => prev.map(e => e.id === movingExam.id ? { ...e, subject: newSubject, grade: newGrade } : e));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setMovingExam(null);
      setIsUpdating(false);
    }
  };

  const confirmDeleteExam = async () => {
    if (!deletingExamId) return;
    setIsDeleting(true);
    const path = `exams/${deletingExamId}`;
    try {
      try {
        await offlineStorage.deleteExam(deletingExamId);
      } catch (offErr) {
        console.warn("Could not delete from offline storage:", offErr);
      }

      if (currentUser && isFirebaseAuthed && auth.currentUser && auth.currentUser.uid === currentUser.uid && !deletingExamId.startsWith('local_')) {
        try {
          const sessionsQuery = query(
            collection(db, 'user_exams'),
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
      {/* Hero: value proposition + create-your-own-exam panel */}
      <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14 mb-16">
        {/* Left Side: Hero Text */}
        <div className="flex-1 text-center lg:text-left">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-[var(--text-primary)] mb-6 tracking-tight leading-tight"
          >
            {t('homeHeroTitlePart1')} <br className="hidden sm:inline" />
            <span className="text-[#8AB4F8]">{t('homeHeroTitlePart2')}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mx-auto lg:mx-0 leading-relaxed"
          >
            {t('homeHeroSubtitle')}
          </motion.p>
        </div>

        {/* Right Side: Build your own exam */}
        <div className="w-full lg:w-[400px] shrink-0">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[32px] p-6 sm:p-7 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-[#8AB4F8]/10 text-[#8AB4F8] flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-display font-bold text-[var(--text-primary)]">{t('uploadExam')}</h2>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">{t('uploadExamDesc')}</p>
              </div>
            </div>

            <ul className="space-y-2 mb-5 text-[11px] text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span>{t('buildStepUpload')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span>{t('buildStepReview')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span>{t('buildStepPractice')}</span>
              </li>
            </ul>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setUploadModalDefaultTab('upload');
                  setIsUploadModalOpen(true);
                }}
                className="w-full bg-[#8AB4F8] text-gray-900 px-5 py-3 rounded-2xl font-bold hover:bg-[#AECBFA] transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Upload className="w-4 h-4" />
                {t('uploadNewExam')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadModalDefaultTab('paste');
                  setIsUploadModalOpen(true);
                }}
                className="w-full bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] px-5 py-3 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Type className="w-4 h-4" />
                {t('pasteQuestions')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        <div className="space-y-8">
            {/* Search & Actions */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
              <input 
                type="text"
                placeholder={t('searchYourExams')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-3.5 pl-12 pr-6 text-[var(--text-primary)] placeholder:text-gray-600 focus:outline-none focus:border-[#8AB4F8] transition-all text-sm"
              />
            </div>
            <div className="relative w-full md:w-auto">
              <button 
                onClick={() => {
                  setUploadModalDefaultTab('upload');
                  setIsUploadModalOpen(true);
                }}
                className="w-full bg-[#8AB4F8] text-gray-900 px-6 py-3.5 rounded-2xl font-bold hover:bg-[#AECBFA] transition-all flex items-center justify-center gap-2 text-sm shadow-md"
              >
                <Upload className="w-4 h-4" />
                {t('uploadNewExam')}
              </button>
              <div className="absolute -top-3 -right-2 bg-[#F6A8B6] text-gray-900 text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full shadow-sm border-2 border-[var(--bg-primary)] z-10">
                BETA
              </div>
            </div>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
            {SUBJECTS.map(subject => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedSubject === subject
                    ? 'bg-[#8AB4F8] text-gray-900'
                    : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
                }`}
              >
                {subject === 'All' ? t('allExams') : getSubjectName(subject)}
              </button>
            ))}
          </div>

          {/* Exam List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#8AB4F8] animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.length > 0 ? (
                filteredExams.map((exam) => {
                  const sessions = userExams.filter(ue => ue.examId === exam.id);
                  const latestSession = sessions[0];

                  return (
                    <motion.div 
                      key={exam.id}
                      layout
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

                      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 line-clamp-1">{exam.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)] mb-6 uppercase tracking-widest font-bold">
                        {getSubjectName(exam.subject)} {exam.grade && exam.grade !== 'General' && `• ${getGradeName(exam.grade)}`}
                      </p>

                      <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-1">{t('status')}</span>
                          {latestSession ? (
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${
                              latestSession.status === 'COMPLETED' ? 'text-green-400' : 'text-yellow-400'
                            }`}>
                              {latestSession.status.replace('_', ' ')}
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
                <div className="col-span-full py-20 text-center bg-[var(--bg-secondary)] border border-dashed border-[var(--border-color)] rounded-[40px]">
                  <p className="text-[var(--text-secondary)] mb-4">{t('noExamsFound')}</p>
                  <button
                    onClick={() => {
                      setUploadModalDefaultTab('upload');
                      setIsUploadModalOpen(true);
                    }}
                    className="text-[#8AB4F8] font-bold hover:underline"
                  >
                    {t('uploadFirstOne')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {deletingExamId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-y-auto">
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-y-auto">
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMovingExam(null)} className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 sm:p-8 rounded-[32px] max-w-md w-full shadow-2xl my-auto max-h-[85vh] overflow-y-auto">
              <div className="bg-[#8AB4F8]/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <FolderOpen className="w-6 h-6 text-[#8AB4F8]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('moveExamTitle')}</h3>
              <p className="text-[var(--text-secondary)] mb-6">Select a new folder for "{movingExam.title}".</p>
              
              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 block">1. Select Subject</label>
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
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 block">2. Select Grade</label>
                  <div className="grid grid-cols-2 gap-2">
                    {GRADES.map(grade => (
                      <button
                        key={grade}
                        onClick={() => setNewGrade(grade)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          newGrade === grade 
                            ? 'bg-[#8AB4F8] text-gray-900 border-[#8AB4F8]' 
                            : 'bg-[var(--bg-accent)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-gray-600'
                        }`}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setMovingExam(null)} className="flex-1 bg-white/5 text-[var(--text-primary)] py-3 rounded-xl font-bold hover:bg-white/10 transition-all">{t('cancel')}</button>
                <button onClick={confirmMove} disabled={isUpdating || !newSubject || !newGrade} className="flex-1 bg-[#8AB4F8] text-gray-900 py-3 rounded-xl font-bold hover:bg-[#AECBFA] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
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
