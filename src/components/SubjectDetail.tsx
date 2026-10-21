import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Play, 
  Clock, 
  CheckCircle2, 
  Upload, 
  ArrowLeft, 
  Folder, 
  GraduationCap,
  Plus,
  Search,
  MoreVertical,
  Calendar,
  Trash2,
  Edit2,
  FolderOpen,
  Menu,
  X,
  Loader2
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { offlineStorage } from '../lib/offlineStorage';
import { SUBJECTS as CANONICAL_SUBJECTS, GRADES, matchesSubject, subjectLabelKey, gradeLabelKey } from '../lib/subjects';
import ExportExamButton from './ExportExamButton';
import { SUPPORTED_UPLOAD_EXTENSIONS } from '../lib/fileParser';

interface Exam {
  id: string;
  title: string;
  subject: string;
  grade: string;
  questions: any[];
  createdAt?: any;
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

interface SubjectDetailProps {
  subject: string;
  onBack: () => void;
  onContinue: (exam: Exam, session: UserExam) => void;
  onRetake: (exam: Exam) => void;
  onViewSummary: (exam: Exam, session: UserExam) => void;
  onUpload: (file: File, subject: string, grade: string) => Promise<void>;
  onProcessText: (text: string, subject: string, grade: string) => Promise<void>;
  isParsing: boolean;
}

type Tab = 'Exam' | 'Ongoing' | 'Results';

export default function SubjectDetail({ 
  subject, 
  onBack, 
  onContinue, 
  onRetake, 
  onViewSummary,
  onUpload,
  onProcessText,
  isParsing
}: SubjectDetailProps) {
  const { currentUser, isFirebaseAuthed } = useAuth();
  const { t } = useLanguage();
  const [exams, setExams] = useState<Exam[]>([]);
  const [userExams, setUserExams] = useState<UserExam[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('Exam');
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({
    'Grade 12': true,
    'Grade 11': false,
    'Grade 10': false,
    'Grade 9': false,
    'General': false
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [uploadingGrade, setUploadingGrade] = useState<string | null>(null);
  const [uploadModalGrade, setUploadModalGrade] = useState<string | null>(null);
  const [pastingGrade, setPastingGrade] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState('');
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [renamingExam, setRenamingExam] = useState<Exam | null>(null);
  const [movingExam, setMovingExam] = useState<Exam | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SUBJECTS: readonly string[] = CANONICAL_SUBJECTS;

  const getSubjectName = (subj: string) => t(subjectLabelKey(subj) as any);
  const getGradeName = (grd: string) => t(gradeLabelKey(grd) as any);

  useEffect(() => {
    let isMounted = true;

    const loadOfflineData = async () => {
      try {
        const localExams = await offlineStorage.getAllExams();
        const localSessions = await offlineStorage.getAllSessions(currentUser?.uid || undefined);
        
        if (!isMounted) return;

        // Filter local custom exams for this subject
        const matchingLocalExams = localExams.filter(e => matchesSubject(e.subject, subject));

        setExams(prev => {
          const map = new Map<string, Exam>();
          matchingLocalExams.forEach(le => {
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
      } catch (err) {
        console.warn("Offline data load notice:", err);
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
        const filteredCloud = cloudExams.filter(e => matchesSubject(e.subject, subject));

        setExams(prev => {
          const map = new Map<string, Exam>();
          prev.forEach(pe => map.set(pe.id, pe));
          filteredCloud.forEach(fe => map.set(fe.id, fe));
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
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'user_exams');
      });
    } catch (err) {
      console.warn("Could not setup Firestore listeners in SubjectDetail:", err);
    }

    return () => {
      isMounted = false;
      unsubscribeExams();
      unsubscribeUserExams();
    };
  }, [currentUser, isFirebaseAuthed, subject]);

  const examsByGrade = useMemo(() => {
    const map: Record<string, Exam[]> = {};
    GRADES.forEach(grade => { map[grade] = []; });
    exams.forEach(exam => {
      if ((GRADES as readonly string[]).includes(exam.grade)) {
        map[exam.grade].push(exam);
      } else {
        map['General'].push(exam);
      }
    });
    return map;
  }, [exams]);

  const ongoingExams = useMemo(() => {
    return userExams
      .filter(ue => ue.status === 'IN_PROGRESS')
      .map(ue => ({
        session: ue,
        exam: exams.find(e => e.id === ue.examId)
      }))
      .filter(item => item.exam !== undefined) as { session: UserExam, exam: Exam }[];
  }, [userExams, exams]);

  const completedExams = useMemo(() => {
    return userExams
      .filter(ue => ue.status === 'COMPLETED')
      .map(ue => ({
        session: ue,
        exam: exams.find(e => e.id === ue.examId)
      }))
      .filter(item => item.exam !== undefined) as { session: UserExam, exam: Exam }[];
  }, [userExams, exams]);

  const toggleGrade = (grade: string) => {
    setExpandedGrades(prev => ({ ...prev, [grade]: !prev[grade] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    GRADES.forEach(g => next[g] = true);
    setExpandedGrades(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    GRADES.forEach(g => next[g] = false);
    setExpandedGrades(next);
  };

  const handleUploadClick = (grade: string) => {
    setUploadModalGrade(grade);
    setDragError('');
  };

  const handleManualFileInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const grade = uploadModalGrade || uploadingGrade;
    if (file && grade) {
      setUploadingGrade(grade);
      setUploadModalGrade(null);
      try {
        await onUpload(file, subject, grade);
      } finally {
        setUploadingGrade(null);
        if (e.target) e.target.value = '';
      }
    }
  };

  const handleDropFile = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setDragError('');
    const file = e.dataTransfer.files?.[0];
    const grade = uploadModalGrade;
    if (!file) return;

    const validExtensions = ['.pdf', '.md', '.txt'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setDragError('Please upload a PDF, MD, or TXT file.');
      return;
    }

    if (grade) {
      setUploadingGrade(grade);
      setUploadModalGrade(null);
      try {
        await onUpload(file, subject, grade);
      } finally {
        setUploadingGrade(null);
      }
    }
  };

  const handlePasteSubmit = async () => {
    if (pastingGrade && pastedText.trim()) {
      await onProcessText(pastedText, subject, pastingGrade);
      setPastingGrade(null);
      setPastedText('');
    }
  };

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
      // Also update in offline storage
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

  const scrollToGrade = (grade: string) => {
    setActiveTab('Exam');
    setExpandedGrades(prev => ({ ...prev, [grade]: true }));
    setIsMobileSidebarOpen(false);
    setTimeout(() => {
      const element = document.getElementById(`grade-section-${grade}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[var(--bg-primary)] relative">
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 bg-[#8AB4F8] text-gray-900 p-4 rounded-full shadow-2xl flex items-center justify-center"
      >
        {isMobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: sidebarCollapsed ? 64 : 280,
          x: isMobileSidebarOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -280 : 0)
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed lg:relative inset-y-0 left-0 z-40 border-r border-white/5 bg-[var(--bg-secondary)] flex flex-col lg:translate-x-0 transition-transform duration-300 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          {!sidebarCollapsed && (
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          )}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ml-auto"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4">
          {!sidebarCollapsed && (
            <div className="space-y-1">
              <div className="flex items-center gap-3 px-3 py-2 text-[#8AB4F8] font-bold mb-2">
                <Folder className="w-5 h-5" />
                <span>{subject}</span>
              </div>
              <div className="ml-4 space-y-1 border-l border-white/5">
                {GRADES.map(grade => (
                  <button
                    key={grade}
                    onClick={() => scrollToGrade(grade)}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-lg transition-all flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                    {grade}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto bg-[var(--bg-primary)] relative">
        <div className="max-w-5xl mx-auto px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-8 tracking-tight">{subject}</h1>
            
            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-white/5">
              {(['Exam', 'Ongoing', 'Results'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${
                    activeTab === tab ? 'text-[#8AB4F8]' : 'text-[var(--text-secondary)] hover:text-gray-300'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8AB4F8]"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'Exam' && (
              <motion.div
                key="exam-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-end">
                  <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                    <button onClick={expandAll} className="hover:text-[#8AB4F8] transition-colors">{t('expandAll')}</button>
                    <span>/</span>
                    <button onClick={collapseAll} className="hover:text-[#8AB4F8] transition-colors">{t('collapseAll')}</button>
                  </div>
                </div>

                {GRADES.map(grade => (
                  <div key={grade} id={`grade-section-${grade}`} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl overflow-hidden">
                    <button 
                      onClick={() => toggleGrade(grade)}
                      className="w-full px-8 py-6 flex items-center justify-between hover:bg-white/2 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-[#8AB4F8]/10 p-3 rounded-2xl">
                          <GraduationCap className="w-6 h-6 text-[#8AB4F8]" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-xl font-bold text-[var(--text-primary)]">{getGradeName(grade)}</h3>
                          <p className="text-sm text-[var(--text-secondary)]">{t('examsAvailable', { count: examsByGrade[grade].length })}</p>
                        </div>
                      </div>
                      <ChevronDown className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${expandedGrades[grade] ? 'rotate-180 text-[#8AB4F8]' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {expandedGrades[grade] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-8 pb-8"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            {examsByGrade[grade].map(exam => {
                              const sessions = userExams.filter(ue => ue.examId === exam.id);
                              const latestSession = sessions[0];
                              
                              return (
                                <div key={exam.id} className="bg-[var(--bg-accent)] border border-white/5 p-5 rounded-2xl hover:border-gray-700 transition-all group">
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-white/5 p-2 rounded-lg group-hover:bg-[#8AB4F8]/10 transition-colors">
                                        <FileText className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[#8AB4F8]" />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-[var(--text-primary)] text-sm line-clamp-1">{exam.title}</h4>
                                        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mt-1">
                                          {exam.createdAt?.toDate ? new Date(exam.createdAt.toDate()).toLocaleDateString() : 'Recently added'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => handleRenameExam(exam)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title={t('renameLabel')}>
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <ExportExamButton exam={exam} />
                                      <button onClick={() => handleMoveExam(exam)} className="p-1.5 text-[var(--text-secondary)] hover:text-[#8AB4F8] transition-colors" title={t('moveToFolder')}>
                                        <FolderOpen className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => setDeletingExamId(exam.id)} className="p-1.5 text-[var(--text-secondary)] hover:text-red-400 transition-colors" title={t('delete')}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-1">{t('statusLabel')}</span>
                                      <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                        latestSession?.status === 'COMPLETED' ? 'text-green-400' : 
                                        latestSession?.status === 'IN_PROGRESS' ? 'text-yellow-400' : 'text-gray-500'
                                      }`}>
                                        {latestSession ? latestSession.status.replace('_', ' ') : 'Not Started'}
                                      </span>
                                    </div>
                                    <button 
                                      onClick={() => onRetake(exam)}
                                      className="bg-[#8AB4F8] text-gray-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#AECBFA] transition-all flex items-center gap-2"
                                    >
                                      <Play className="w-3 h-3 fill-current" />
                                      Take Exam
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            <button 
                              onClick={() => handleUploadClick(grade)}
                              disabled={isParsing}
                              className="border-2 border-dashed border-[var(--border-color)] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 hover:border-gray-600 hover:bg-white/2 transition-all group"
                            >
                              {isParsing && uploadingGrade === grade ? (
                                <Loader2 className="w-6 h-6 text-[#8AB4F8] animate-spin" />
                              ) : (
                                <div className="bg-white/5 p-2 rounded-lg group-hover:bg-[#8AB4F8]/10 transition-colors">
                                  <Upload className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[#8AB4F8]" />
                                </div>
                              )}
                              <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                                {isParsing && uploadingGrade === grade ? 'Analyzing...' : 'Upload Exam'}
                              </span>
                            </button>

                            <button 
                              onClick={() => setPastingGrade(grade)}
                              disabled={isParsing}
                              className="border-2 border-dashed border-[var(--border-color)] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 hover:border-gray-600 hover:bg-white/2 transition-all group"
                            >
                              <div className="bg-white/5 p-2 rounded-lg group-hover:bg-[#8AB4F8]/10 transition-colors">
                                <FileText className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[#8AB4F8]" />
                              </div>
                              <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                                Paste Exam
                              </span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'Ongoing' && (
              <motion.div
                key="ongoing-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {ongoingExams.length > 0 ? (
                  ongoingExams.map(({ session, exam }) => (
                    <div key={session.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-3xl hover:border-gray-700 transition-all">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="bg-yellow-400/10 p-3 rounded-2xl">
                            <Clock className="w-6 h-6 text-yellow-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">{exam.title}</h3>
                            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mt-1">{exam.grade}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-[var(--text-secondary)]">
                          Started {new Date(session.startTime).toLocaleDateString()}
                        </div>
                        <button 
                          onClick={() => onContinue(exam, session)}
                          className="bg-[#8AB4F8] text-gray-900 px-6 py-2 rounded-xl text-sm font-bold hover:bg-[#AECBFA] transition-all"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-24 text-center">
                    <p className="text-[var(--text-secondary)]">{t('noExamsInProgress')}</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'Results' && (
              <motion.div
                key="results-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {completedExams.length > 0 ? (
                  completedExams.map(({ session, exam }) => (
                    <div key={session.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-3xl hover:border-gray-700 transition-all">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="bg-green-400/10 p-3 rounded-2xl">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">{exam.title}</h3>
                            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mt-1">{exam.grade}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-[var(--text-secondary)]">
                          Completed {session.lastUpdated?.toDate ? new Date(session.lastUpdated.toDate()).toLocaleDateString() : 'Recently'}
                        </div>
                        <button 
                          onClick={() => onViewSummary(exam, session)}
                          className="bg-white/5 text-[var(--text-primary)] px-6 py-2 rounded-xl text-sm font-bold hover:bg-white/10 transition-all border border-white/5"
                        >
                          View Results
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-24 text-center">
                    <p className="text-[var(--text-secondary)]">{t('noCompletedExams')}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={SUPPORTED_UPLOAD_EXTENSIONS.join(",")}
      />

      {/* Modals */}
      <AnimatePresence>
        {uploadModalGrade && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUploadModalGrade(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-[32px] max-w-lg w-full shadow-2xl flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#8AB4F8]/10 w-10 h-10 rounded-xl flex items-center justify-center">
                  <Upload className="w-5 h-5 text-[#8AB4F8]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{t('uploadExamFile')}</h3>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest">{subject} • {uploadModalGrade}</p>
                </div>
              </div>

              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={handleDropFile}
                onClick={handleManualFileInputClick}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all mb-4 ${
                  isDragging 
                    ? 'border-[#8AB4F8] bg-[#8AB4F8]/10 scale-[1.02]' 
                    : 'border-[var(--border-color)] hover:border-[#8AB4F8] hover:bg-white/2'
                }`}
              >
                <div className="bg-white/5 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-[#8AB4F8]" />
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">{t('dragDropText')}</h4>
                <p className="text-xs text-[var(--text-secondary)]">{t('supportsFormatsShort')}</p>
              </div>

              {dragError && (
                <p className="text-xs text-red-400 mb-4">{dragError}</p>
              )}

              <div className="flex gap-3 justify-end mt-4">
                <button onClick={() => setUploadModalGrade(null)} className="px-6 bg-white/5 text-[var(--text-primary)] py-3 rounded-xl font-bold hover:bg-white/10 transition-all text-xs">
                  Cancel
                </button>
                <button onClick={handleManualFileInputClick} className="px-6 bg-[#8AB4F8] text-gray-900 py-3 rounded-xl font-bold hover:bg-[#AECBFA] transition-all flex items-center justify-center gap-2 text-xs">
                  <Upload className="w-4 h-4" />
                  Select File
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {pastingGrade && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPastingGrade(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-[32px] max-w-2xl w-full shadow-2xl flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#8AB4F8]/10 w-10 h-10 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#8AB4F8]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{t('pasteExamText')}</h3>
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest">{pastingGrade}</p>
                </div>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                disabled={isParsing}
                placeholder={t('pasteExamPlaceholder')}
                className="w-full h-64 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] resize-none focus:outline-none focus:border-[#8AB4F8] transition-colors mb-6"
              />
              <div className="flex gap-3 justify-end mt-auto">
                <button onClick={() => setPastingGrade(null)} disabled={isParsing} className="px-6 bg-white/5 text-[var(--text-primary)] py-3 rounded-xl font-bold hover:bg-white/10 transition-all">{t('cancel')}</button>
                <button onClick={handlePasteSubmit} disabled={isParsing || !pastedText.trim()} className="px-8 bg-[#8AB4F8] text-gray-900 py-3 rounded-xl font-bold hover:bg-[#AECBFA] transition-all flex items-center justify-center gap-2">
                  {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Exam'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {deletingExamId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingExamId(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-[32px] max-w-sm w-full shadow-2xl">
              <div className="bg-red-400/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('deleteExamTitle')}</h3>
              <p className="text-[var(--text-secondary)] mb-8">{t('deleteExamWarning')}</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingExamId(null)} className="flex-1 bg-white/5 text-[var(--text-primary)] py-3 rounded-xl font-bold hover:bg-white/10 transition-all">{t('cancel')}</button>
                <button onClick={confirmDeleteExam} disabled={isDeleting} className="flex-1 bg-red-400 text-white py-3 rounded-xl font-bold hover:bg-red-500 transition-all flex items-center justify-center gap-2">
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {renamingExam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRenamingExam(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-[32px] max-w-md w-full shadow-2xl">
              <div className="bg-[#8AB4F8]/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <Edit2 className="w-6 h-6 text-[#8AB4F8]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('renameExamTitle')}</h3>
              <p className="text-[var(--text-secondary)] mb-6">{t('renameExamPrompt')}</p>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-gray-600 focus:outline-none focus:border-[#8AB4F8] transition-colors mb-8" placeholder={t('examTitlePlaceholder')} autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setRenamingExam(null)} className="flex-1 bg-white/5 text-[var(--text-primary)] py-3 rounded-xl font-bold hover:bg-white/10 transition-all">{t('cancel')}</button>
                <button onClick={confirmRename} disabled={isUpdating || !newTitle.trim()} className="flex-1 bg-[#8AB4F8] text-gray-900 py-3 rounded-xl font-bold hover:bg-[#AECBFA] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {movingExam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMovingExam(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-[32px] max-w-md w-full shadow-2xl">
              <div className="bg-[#8AB4F8]/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <FolderOpen className="w-6 h-6 text-[#8AB4F8]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('moveExamTitleShort')}</h3>
              <p className="text-[var(--text-secondary)] mb-6">Select a new folder for "{movingExam.title}".</p>
              
              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 block">1. Select Subject</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SUBJECTS.map(subject => (
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
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Move'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}