import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Trash2, Edit2, Loader2, Search, ChevronRight, Play, CheckCircle2, AlertCircle, FolderOpen, Zap, Upload, Type, Sparkles, Calculator, BookOpen, GraduationCap, FlaskConical, Atom, Dna, Brain } from 'lucide-react';
import { 
  english2017Exam, math2017Exam, chemistry2017Exam, physics2017Exam, biology2017Exam, aptitude2017Exam,
  english2016Exam, math2016Exam, chemistry2016Exam, physics2016Exam, biology2016Exam, aptitude2016Exam,
  english2015Exam, math2015Exam, physics2015Exam, chemistry2015Exam, biology2015Exam
} from '../data/sampleExams';
import ExamUploadModal from './ExamUploadModal';

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
  onStartNew: () => void;
  onContinue: (exam: Exam, session: UserExam) => void;
  onRetake: (exam: Exam) => void;
  onViewSummary: (exam: Exam, session: UserExam) => void;
  onLoadSample?: (sampleData: any) => void;
  onUpload?: (file: File, subject: string, grade: string) => Promise<void>;
  onProcessText?: (text: string, subject: string, grade: string) => Promise<void>;
  isParsing?: boolean;
}

const SUBJECTS: string[] = ['All', ...CANONICAL_SUBJECTS];

export default function Home({ onStartNew, onContinue, onRetake, onViewSummary, onLoadSample, onUpload, onProcessText, isParsing }: HomeProps) {
  const { currentUser, isFirebaseAuthed } = useAuth();
  const { t } = useLanguage();
  const [exams, setExams] = useState<Exam[]>([]);
  const [userExams, setUserExams] = useState<UserExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadModalDefaultTab, setUploadModalDefaultTab] = useState<'upload' | 'paste'>('upload');
  const [examYearTab, setExamYearTab] = useState<'2017' | '2016' | '2015'>('2017');
  
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

        const customLocalExams = localExams.filter(e => !e.isSample);

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

  const getSubjectName = (subj: string) => t(subjectLabelKey(subj) as any);
  const getGradeName = (grd?: string) => t(gradeLabelKey(grd) as any);

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
      {/* Hero Section: Left Text, Right Sample Exams */}
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

        {/* Right Side: Official National Exam Cards (2017 E.C. & 2016 E.C.) */}
        <div className="w-full lg:w-[540px] shrink-0 flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-color)] overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setExamYearTab('2017')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center whitespace-nowrap gap-1.5 ${
                  examYearTab === '2017'
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                2017 E.C. (2025)
              </button>
              <button
                type="button"
                onClick={() => setExamYearTab('2016')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center whitespace-nowrap gap-1.5 ${
                  examYearTab === '2016'
                    ? 'bg-emerald-400 text-black shadow-md shadow-emerald-400/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <GraduationCap className="w-3 h-3" />
                2016 E.C. (2024)
              </button>
              <button
                type="button"
                onClick={() => setExamYearTab('2015')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center whitespace-nowrap gap-1.5 ${
                  examYearTab === '2015'
                    ? 'bg-blue-400 text-black shadow-md shadow-blue-400/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                2015 E.C. (2023)
              </button>
            </div>
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 whitespace-nowrap">
              {examYearTab === '2017' ? '6 Official Papers' : examYearTab === '2016' ? '6 Official Booklets' : '5 Official Booklets'}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {examYearTab === '2017' ? (
              <motion.div
                key="year-2017-grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5"
              >
                {/* 2017 E.C. English Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(english2017Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-amber-400 hover:shadow-amber-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-amber-400/10 text-amber-400 text-[9px] font-bold rounded-full border border-amber-400/20 uppercase tracking-wider">
                        2017 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-amber-400 transition-colors line-clamp-1">
                      2017 English
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {english2017Exam.questions.length} Questions • ESSLCE
                      {english2017Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2017 E.C. Math Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(math2017Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-[#8AB4F8] hover:shadow-[#8AB4F8]/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-[#8AB4F8]/10 text-[#8AB4F8] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-[#8AB4F8]/10 text-[#8AB4F8] text-[9px] font-bold rounded-full border border-[#8AB4F8]/20 uppercase tracking-wider">
                        2017 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-[#8AB4F8] transition-colors line-clamp-1">
                      2017 Mathematics
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {math2017Exam.questions.length} Questions • Nat. Sci
                      {math2017Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-[#8AB4F8] group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2017 E.C. Chemistry Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(chemistry2017Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-emerald-400 hover:shadow-emerald-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FlaskConical className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-emerald-400/10 text-emerald-400 text-[9px] font-bold rounded-full border border-emerald-400/20 uppercase tracking-wider">
                        2017 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-emerald-400 transition-colors line-clamp-1">
                      2017 Chemistry
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {chemistry2017Exam.questions.length} Questions • Full ESSLCE
                      {chemistry2017Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-emerald-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2017 E.C. Physics Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(physics2017Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-purple-400 hover:shadow-purple-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Atom className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-purple-400/10 text-purple-400 text-[9px] font-bold rounded-full border border-purple-400/20 uppercase tracking-wider">
                        2017 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-purple-400 transition-colors line-clamp-1">
                      2017 Physics
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {physics2017Exam.questions.length} Questions • Full ESSLCE
                      {physics2017Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-purple-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2017 E.C. Biology Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(biology2017Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-rose-400 hover:shadow-rose-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-rose-400/10 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Dna className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-rose-400/10 text-rose-400 text-[9px] font-bold rounded-full border border-rose-400/20 uppercase tracking-wider">
                        2017 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-rose-400 transition-colors line-clamp-1">
                      2017 Biology
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {biology2017Exam.questions.length} Questions • Booklet 351
                      {biology2017Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-rose-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2017 E.C. Aptitude Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(aptitude2017Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-cyan-400 hover:shadow-cyan-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Brain className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-cyan-400/10 text-cyan-400 text-[9px] font-bold rounded-full border border-cyan-400/20 uppercase tracking-wider">
                        2017 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-cyan-400 transition-colors line-clamp-1">
                      2017 Aptitude
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {aptitude2017Exam.questions.length} Questions • Verbal & Quant
                      {aptitude2017Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-cyan-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            ) : examYearTab === '2016' ? (
              <motion.div
                key="year-2016-grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5"
              >
                {/* 2016 E.C. English Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(english2016Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-amber-400 hover:shadow-amber-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-amber-400/10 text-amber-400 text-[9px] font-bold rounded-full border border-amber-400/20 uppercase tracking-wider">
                        2016 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-amber-400 transition-colors line-clamp-1">
                      2016 English
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {english2016Exam.questions.length} Questions • Booklet 116
                      {english2016Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2016 E.C. Mathematics Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(math2016Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-blue-400 hover:shadow-blue-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-blue-400/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-blue-400/10 text-blue-400 text-[9px] font-bold rounded-full border border-blue-400/20 uppercase tracking-wider">
                        2016 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-blue-400 transition-colors line-clamp-1">
                      2016 Math
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {math2016Exam.questions.length} Questions • Booklet 110
                      {math2016Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-blue-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2016 E.C. Chemistry Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(chemistry2016Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-emerald-400 hover:shadow-emerald-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FlaskConical className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-emerald-400/10 text-emerald-400 text-[9px] font-bold rounded-full border border-emerald-400/20 uppercase tracking-wider">
                        2016 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-emerald-400 transition-colors line-clamp-1">
                      2016 Chemistry
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {chemistry2016Exam.questions.length} Questions • Booklet 197
                      {chemistry2016Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-emerald-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2016 E.C. Physics Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(physics2016Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-purple-400 hover:shadow-purple-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Atom className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-purple-400/10 text-purple-400 text-[9px] font-bold rounded-full border border-purple-400/20 uppercase tracking-wider">
                        2016 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-purple-400 transition-colors line-clamp-1">
                      2016 Physics
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {physics2016Exam.questions.length} Questions • Booklet 175
                      {physics2016Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-purple-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2016 E.C. Biology Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(biology2016Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-rose-400 hover:shadow-rose-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-rose-400/10 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Dna className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-rose-400/10 text-rose-400 text-[9px] font-bold rounded-full border border-rose-400/20 uppercase tracking-wider">
                        2016 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-rose-400 transition-colors line-clamp-1">
                      2016 Biology
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {biology2016Exam.questions.length} Questions • Booklet 113
                      {biology2016Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-rose-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2016 E.C. Aptitude Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(aptitude2016Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-cyan-400 hover:shadow-cyan-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Brain className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-cyan-400/10 text-cyan-400 text-[9px] font-bold rounded-full border border-cyan-400/20 uppercase tracking-wider">
                        2016 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-cyan-400 transition-colors line-clamp-1">
                      2016 Aptitude
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {aptitude2016Exam.questions.length} Questions • Booklet 094
                      {aptitude2016Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-cyan-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="year-2015-grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5"
              >
                {/* 2015 E.C. English Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(english2015Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-blue-400 hover:shadow-blue-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-blue-400/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-blue-400/10 text-blue-400 text-[9px] font-bold rounded-full border border-blue-400/20 uppercase tracking-wider">
                        2015 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-blue-400 transition-colors line-clamp-1">
                      2015 English
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {english2015Exam.questions.length} Questions • Booklet 304
                      {english2015Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-blue-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2015 E.C. Math Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(math2015Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-blue-400 hover:shadow-blue-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-blue-400/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-blue-400/10 text-blue-400 text-[9px] font-bold rounded-full border border-blue-400/20 uppercase tracking-wider">
                        2015 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-blue-400 transition-colors line-clamp-1">
                      2015 Math
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {math2015Exam.questions.length} Questions • Booklet 339
                      {math2015Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-blue-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2015 E.C. Physics Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(physics2015Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-blue-400 hover:shadow-blue-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-blue-400/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Atom className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-blue-400/10 text-blue-400 text-[9px] font-bold rounded-full border border-blue-400/20 uppercase tracking-wider">
                        2015 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-blue-400 transition-colors line-clamp-1">
                      2015 Physics
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {physics2015Exam.questions.length} Questions • Booklet 527
                      {physics2015Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-blue-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2015 E.C. Biology Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(biology2015Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-blue-400 hover:shadow-blue-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-blue-400/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Dna className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-blue-400/10 text-blue-400 text-[9px] font-bold rounded-full border border-blue-400/20 uppercase tracking-wider">
                        2015 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-blue-400 transition-colors line-clamp-1">
                      2015 Biology
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {biology2015Exam.questions.length} Questions • Booklet 480
                      {biology2015Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-blue-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>

                {/* 2015 E.C. Chemistry Exam Card */}
                <motion.div 
                  onClick={() => {
                    if (!isParsing && onLoadSample) {
                      onLoadSample(chemistry2015Exam);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer group shadow-lg hover:border-blue-400 hover:shadow-blue-400/5 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-blue-400/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FlaskConical className="w-4 h-4" />
                      </div>
                      <span className="px-1.5 py-0.5 bg-blue-400/10 text-blue-400 text-[9px] font-bold rounded-full border border-blue-400/20 uppercase tracking-wider">
                        2015 E.C.
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-display font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-blue-400 transition-colors line-clamp-1">
                      2015 Chemistry
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                      {chemistry2015Exam.questions.length} Questions • Booklet 496
                      {chemistry2015Exam.questions.length < 40 && (
                        <span className="text-amber-400"> • {t('partialPaper')}</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center text-[11px] font-bold text-blue-400 group-hover:translate-x-0.5 transition-transform gap-1">
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('startExam')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-12">
        {currentUser ? (
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
                {subject}
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
                          <button 
                            onClick={() => handleRenameExam(exam)}
                            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleMoveExam(exam)}
                            className="p-2 text-[var(--text-secondary)] hover:text-[#8AB4F8] transition-colors"
                            title="Move to Folder"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeletingExamId(exam.id)}
                            className="p-2 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 line-clamp-1">{exam.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)] mb-6 uppercase tracking-widest font-bold">
                        {exam.subject} {exam.grade && exam.grade !== 'General' && `• ${exam.grade}`}
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
                  <button onClick={onStartNew} className="text-[#8AB4F8] font-bold hover:underline">{t('uploadFirstOne')}</button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
          <div className="text-center py-16 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-8 max-w-lg mx-auto">
            <p className="text-[var(--text-secondary)] mb-6 text-sm">{t('signInPrompt')}</p>
            <button onClick={() => window.location.reload()} className="bg-[#8AB4F8] text-gray-900 font-bold px-8 py-3 rounded-xl hover:bg-[#AECBFA] transition-all text-sm">
              {t('signIn')}
            </button>
          </div>
        )}
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
              <p className="text-[var(--text-secondary)] mb-6">Enter a new title for your exam.</p>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-gray-600 focus:outline-none focus:border-[#8AB4F8] transition-colors mb-8" placeholder="Exam Title" autoFocus />
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
          isParsing={isParsing}
        />
      )}
    </div>
  );
}
