import { useState, useEffect, useRef } from 'react';
import { Loader2, Info, BookOpen, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExamInterface from './components/ExamInterface';
import SummaryPage from './components/SummaryPage';
import Dashboard from './components/Dashboard';
import Home from './components/Home';
import SubjectDetail from './components/SubjectDetail';
import LandingPage from './components/LandingPage';
import Header from './components/Header';
import Footer from './components/Footer';
import TimerSelection from './components/TimerSelection';
import InitialSetupModal from './components/InitialSetupModal';
import OfflineBanner from './components/OfflineBanner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { runWithTimeout, CRITICAL_WRITE_TIMEOUT_MS, LOCAL_WRITE_TIMEOUT_MS } from './lib/cloudWrite';
import { prepareExamQuestions } from './lib/examQuality';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { OfflineProvider, useOffline } from './contexts/OfflineContext';
import { generateExamFromDocument, type Question } from './services/geminiService';
import { readFileAsBase64, extractTextFromFile, assertSupportedUpload, getFileExtension, isLocalImportFile } from './lib/fileParser';

import { db, auth } from './firebase';
import { collection, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { offlineStorage } from './lib/offlineStorage';
import { gradeExam } from './lib/scoring';
import { parseExamText } from './lib/examImport';
import { ensureSubjectFolder } from './lib/subjectStore';
import { getCorrectAnswer } from './lib/scoring';
import { suggestTitleFromFileName, type ImportedExam } from './lib/examSchema';
import { getExamProgressKey } from './lib/examProgress';
type View = 'DASHBOARD' | 'UPLOAD' | 'TIMER_SELECTION' | 'EXAM' | 'SUMMARY' | 'SUBJECT_DETAIL';
type Tab = 'HOME' | 'MY_EXAM';

function AppContent() {
  const [view, setView] = useState<View>('DASHBOARD');
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [examTitle, setExamTitle] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('General');
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [saveProgress, setSaveProgress] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    const savedTheme = localStorage.getItem('euee_theme');
    if (savedTheme === 'light') return false;
    if (savedTheme === 'dark') return true;
    return !window.matchMedia?.('(prefers-color-scheme: light)').matches;
  });
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [recommendedTimeLimit, setRecommendedTimeLimit] = useState<number | null>(null);
  const [originalExam, setOriginalExam] = useState<any | null>(null);
  const [lastResult, setLastResult] = useState<{ score: number; total: number; percentage: number; duration: number; completedAt: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { currentUser, logout, loginWithGoogle, isInitializing: authLoading, isFirebaseAuthed } = useAuth();
  const { saveExamLocally, saveSessionLocally, queueExamForSync, isOnline } = useOffline();

  const [isGuestMode, setIsGuestMode] = useState(() => localStorage.getItem('onboarded') === 'true');
  const { t } = useLanguage();
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isCompleted = localStorage.getItem('euee_initial_setup_completed');
    const isOnboarded = localStorage.getItem('onboarded');
    return !isCompleted && !isOnboarded;
  });

  useEffect(() => {
    if (currentUser) {
      setShowOnboarding(false);
      // Signing in (by any method, including Google) ends guest mode, so the
      // dashboard is no longer limited to device-only data.
      setIsGuestMode(false);
      localStorage.setItem('euee_initial_setup_completed', 'true');
      localStorage.setItem('onboarded', 'true');
    }
  }, [currentUser]);

  const handleGuestModeFromOnboarding = () => {
    localStorage.setItem('euee_initial_setup_completed', 'true');
    localStorage.setItem('onboarded', 'true');
    setIsGuestMode(true);
    setShowOnboarding(false);
    setView('DASHBOARD');
  };

  const handleSignInFromOnboarding = () => {
    localStorage.setItem('euee_initial_setup_completed', 'true');
    localStorage.setItem('onboarded', 'true');
    setShowOnboarding(false);
    setIsGuestMode(false);
    setView('UPLOAD'); // Will go back to auth/landing
  };

  const handleDismissOnboarding = () => {
    localStorage.setItem('euee_initial_setup_completed', 'true');
    localStorage.setItem('onboarded', 'true');
    setShowOnboarding(false);
  };

  useEffect(() => {
    if (!authLoading && !currentUser && !isGuestMode) {
      setView('UPLOAD');
    } else if (currentUser && view === 'UPLOAD') {
      setView('DASHBOARD');
    }
  }, [currentUser, authLoading, isGuestMode, view]);

  // Toasts are informational: they fade on their own so a stale error banner
  // never covers the page, while "Dismiss" still works immediately.
  useEffect(() => {
    if (!errorMessage) return;
    const timer = window.setTimeout(() => setErrorMessage(null), 10000);
    return () => window.clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
    }
    try {
      localStorage.setItem('euee_theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // Private mode / storage disabled — theme simply will not persist.
    }
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', isDarkMode ? '#0A0A0A' : '#F4F6F8');
  }, [isDarkMode]);

  // Restore in-progress exam state if page was refreshed during active exam
  useEffect(() => {
    try {
      const savedActiveState = localStorage.getItem('euee_active_exam_state');
      if (savedActiveState) {
        const parsed = JSON.parse(savedActiveState);
        if (parsed && parsed.saveProgress && parsed.examQuestions && parsed.examQuestions.length > 0) {
          setExamQuestions(parsed.examQuestions);
          setExamTitle(parsed.examTitle || 'Exam');
          setSelectedSubject(parsed.selectedSubject || 'General');
          setSelectedGrade(parsed.selectedGrade || 'Grade 12');
          setCurrentExamId(parsed.currentExamId || null);
          setTimeLimit(parsed.timeLimit || null);
          setStartTime(parsed.startTime || Date.now());
          setSaveProgress(true);
          setCurrentSessionId(parsed.currentSessionId || null);
          setView('EXAM');
        }
      }
    } catch (err) {
      console.warn("Could not restore active exam state:", err);
    }
  }, []);

  // Synchronize active exam state while taking an exam with saveProgress enabled
  useEffect(() => {
    if (view === 'EXAM' && saveProgress && examQuestions.length > 0) {
      try {
        localStorage.setItem('euee_active_exam_state', JSON.stringify({
          currentExamId,
          examTitle,
          selectedSubject,
          selectedGrade,
          examQuestions,
          timeLimit,
          startTime,
          saveProgress,
          currentSessionId
        }));
      } catch (err) {
        console.warn("Could not cache active exam state:", err);
      }
    } else if (view === 'SUMMARY') {
      try {
        localStorage.removeItem('euee_active_exam_state');
      } catch {}
    }
  }, [view, saveProgress, examQuestions, currentExamId, examTitle, selectedSubject, selectedGrade, timeLimit, startTime, currentSessionId]);

  // Sync guest exams and sessions to cloud upon login.
  // Guarded by a ref so the effect cannot re-run (and re-upload) simply because
  // the offline context re-created its callbacks on the next render.
  const guestSyncUidRef = useRef<string | null>(null);
  useEffect(() => {
    let isMounted = true;
    const syncGuestData = async () => {
      if (!currentUser || !isOnline || !isFirebaseAuthed || !auth.currentUser || auth.currentUser.uid !== currentUser.uid) return;
      if (guestSyncUidRef.current === currentUser.uid) return;
      guestSyncUidRef.current = currentUser.uid;
      
      try {
        const localExams = await offlineStorage.getAllExams();
        const guestExams = localExams.filter(e => e.createdBy === 'guest');
        
        for (const exam of guestExams) {
          if (!isMounted) break;
          try {
            // Upload to Firestore
            const examRef = doc(collection(db, 'exams'));
            await setDoc(examRef, {
              title: exam.title,
              subject: exam.subject,
              grade: exam.grade,
              questions: exam.questions,
              createdBy: currentUser.uid,
              createdAt: serverTimestamp()
            });
            
            // Delete old guest local exam
            await offlineStorage.deleteExam(exam.id);
            
            // Save new exam locally with Firestore ID
            await saveExamLocally({
              ...exam,
              id: examRef.id,
              createdBy: currentUser.uid
            });
            
            // Update sessions pointing to old guest exam
            const sessions = await offlineStorage.getAllSessions();
            for (const session of sessions) {
              if (session.examId === exam.id) {
                 const updatedSession = { ...session };
                 updatedSession.examId = examRef.id;
                 if (updatedSession.userId === 'guest' || !updatedSession.userId) {
                    updatedSession.userId = currentUser.uid;
                 }
                 await saveSessionLocally(updatedSession);
                 
                 // Push to cloud
                 const sessionRef = doc(collection(db, 'user_exams'));
                 await setDoc(sessionRef, {
                    userId: currentUser.uid,
                    examId: examRef.id,
                    status: updatedSession.status,
                    answers: updatedSession.answers,
                    score: updatedSession.score ?? null,
                    total: updatedSession.total ?? null,
                    percentage: updatedSession.percentage ?? null,
                    startTime: updatedSession.startTime,
                    timeLimit: updatedSession.timeLimit,
                    lastUpdated: serverTimestamp()
                 });
                 // Delete old session locally
                 await offlineStorage.deleteSession(session.id);
                 // Save the new session with the new ID
                 updatedSession.id = sessionRef.id;
                 await saveSessionLocally(updatedSession);
              }
            }
          } catch (e) {
             console.warn("Failed syncing guest exam:", e);
          }
        }
      } catch (err) {
         console.warn("Error accessing offline storage for guest sync:", err);
      }
    };
    
    syncGuestData();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, isFirebaseAuthed, isOnline]);

  /**
   * Local-first exam persistence.
   *
   * The id is generated on the device (a Firestore doc id when the student is
   * signed in, so the local copy and the cloud copy share one id). The local
   * save is awaited because IndexedDB is fast and it is what the next screen
   * reads; the cloud write runs in the background with a timeout, so a slow or
   * unreachable backend can never leave the UI stuck on a spinner.
   */
  const persistNewExam = async (examData: {
    title: string;
    subject: string;
    grade: string;
    questions: any[];
    createdBy: string;
    createdAt: number;
    source: 'custom';
    timeLimit?: number;
  }): Promise<string> => {
    const canWriteCloud =
      Boolean(currentUser) &&
      isOnline &&
      isFirebaseAuthed &&
      Boolean(auth.currentUser) &&
      auth.currentUser!.uid === currentUser!.uid;

    const examRef = canWriteCloud ? doc(collection(db, 'exams')) : null;
    const examId = examRef?.id || `exam_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    setCurrentExamId(examId);
    setOriginalExam({ ...examData, id: examId });

    // IndexedDB is normally instant; bound it anyway so a blocked database
    // cannot stop the student from starting the exam.
    await runWithTimeout(
      () => saveExamLocally({ id: examId, ...examData }),
      LOCAL_WRITE_TIMEOUT_MS,
      'Local exam save'
    );

    if (examRef) {
      const ref = examRef;
      // Fire and forget: navigation must not wait for the network.
      void (async () => {
        const saved = await runWithTimeout(() =>
          setDoc(ref, {
            title: examData.title,
            subject: examData.subject,
            grade: examData.grade,
            questions: examData.questions,
            createdBy: examData.createdBy,
            createdAt: serverTimestamp(),
            ...(examData.timeLimit ? { timeLimit: examData.timeLimit } : {}),
          })
        );
        if (!saved) {
          // Replay it when the connection comes back instead of losing it.
          await queueExamForSync({ id: examId, ...examData });
        }
      })();
    }

    return examId;
  };

  const processExamContent = async (options: {
    rawText?: string;
    fileBase64?: string;
    mimeType?: string;
    fileName?: string;
    subject: string;
    grade?: string;
  }) => {
    setIsParsing(true);
    setErrorMessage(null);
    try {
      const result = await generateExamFromDocument({
        rawText: options.rawText,
        fileBase64: options.fileBase64,
        mimeType: options.mimeType,
        fileName: options.fileName,
        titleHint: options.subject
      });
      
      const rawTitle = (result.title && result.title !== 'General Exam' && result.title !== 'Uploaded Exam Practice')
        ? result.title
        : (options.fileName ? options.fileName.replace(/\.[^/.]+$/, '') : `${options.subject}${options.grade ? ` - Grade ${options.grade}` : ''}`);
      const computedTitle = rawTitle.trim() || 'Custom Exam';

      const prepared = prepareExamQuestions(result.questions);
      if (prepared.questions.length === 0) {
        throw new Error(
          'The document was read but produced no usable multiple-choice questions. Each question needs a stem and at least two options.'
        );
      }
      if (prepared.dropped > 0) {
        console.warn(`Dropped ${prepared.dropped} unusable question(s) from the AI result.`);
      }

      if (result.warning) setErrorMessage(result.warning);
      // A paper that names its own subject must get a matching folder,
      // otherwise it would be invisible in every folder view.
      const resolvedSubject = ensureSubjectFolder(options.subject || 'General');
      setExamQuestions(prepared.questions);
      setExamTitle(computedTitle);
      setSelectedSubject(resolvedSubject);
      setSelectedGrade(options.grade || 'General');
      setRecommendedTimeLimit(null);
      setCurrentSessionId(null);

      // Local-first: the exam appears immediately, the cloud copy follows.
      await persistNewExam({
        title: computedTitle,
        subject: resolvedSubject,
        grade: options.grade || 'General',
        questions: prepared.questions,
        createdBy: currentUser?.uid || 'guest',
        createdAt: Date.now(),
        source: 'custom' as const,
      });

      setView('TIMER_SELECTION');
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Failed to generate exam.");
    } finally {
      setIsParsing(false);
    }
  };

  /**
   * Adds an exam that was parsed on this device (JSON / Markdown import).
   * No AI call, no quota, nothing to hallucinate.
   */
  const handleImportExam = async (imported: ImportedExam) => {
    setErrorMessage(null);
    const prepared = prepareExamQuestions(imported.questions);
    if (prepared.questions.length === 0) {
      throw new Error('This file did not contain any usable question. Nothing was added.');
    }
    const title = imported.title?.trim() || 'Imported Exam';
    const examData = {
      title,
      subject: ensureSubjectFolder(imported.subject || 'General'),
      grade: imported.grade || 'General',
      questions: prepared.questions,
      createdBy: currentUser?.uid || 'guest',
      createdAt: Date.now(),
      source: 'custom' as const,
      ...(imported.timeLimit && imported.timeLimit > 0 ? { timeLimit: imported.timeLimit } : {}),
    };

    setExamQuestions(prepared.questions);
    setExamTitle(title);
    setSelectedSubject(examData.subject);
    setSelectedGrade(examData.grade);
    setRecommendedTimeLimit(imported.timeLimit && imported.timeLimit > 0 ? imported.timeLimit : null);
    setCurrentSessionId(null);
    setUserAnswers({});

    await persistNewExam(examData);

    setView('TIMER_SELECTION');
  };

  const handleFileUpload = async (file: File, subject: string, grade?: string) => {
    setSelectedSubject(subject);
    try {
      assertSupportedUpload(file);
      if (isLocalImportFile(file)) {
        // Structured files are read on-device: sending them to the AI would
        // only risk reformatting a file that is already correct.
        const raw = await file.text();
        const report = parseExamText(raw, { subject, grade, title: suggestTitleFromFileName(file.name) });
        if (report.ok && report.exam) {
          await handleImportExam(report.exam);
          return;
        }
        // A Markdown file may be prose rather than a question list; let the AI
        // try. A broken JSON file is a real error, so report it directly.
        if (getFileExtension(file.name) === '.json') {
          throw new Error(
            report.issues.find((issue) => issue.level === 'error')?.message ||
              'Could not import that JSON file.'
          );
        }
      }
      if (file.size > 15 * 1024 * 1024) {
        throw new Error('That file is larger than 15MB. Please compress it or upload a smaller section.');
      }
      const [base64, extractedText] = await Promise.all([
        readFileAsBase64(file),
        extractTextFromFile(file).catch(() => '')
      ]);

      await processExamContent({
        fileBase64: base64,
        rawText: extractedText || undefined,
        fileName: file.name,
        mimeType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined),
        subject,
        grade
      });
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || "Error reading uploaded file");
    }
  };

  const handleTextSubmit = async (text: string, subject: string, grade?: string) => {
    setSelectedSubject(subject);
    await processExamContent({ rawText: text, subject, grade });
  };

  const handleTimerSelection = async (seconds: number, saveProgressChoice: boolean) => {
    // seconds === 0 means practice mode without any countdown.
    setTimeLimit(seconds > 0 ? seconds : null);
    setSaveProgress(saveProgressChoice);
    setStartTime(Date.now());
    setUserAnswers({});
    setCurrentSessionId(null);
    // Never inherit a previous attempt's snapshots for this paper.
    try {
      localStorage.removeItem(getExamProgressKey(currentExamId, examTitle));
    } catch {}
    
    // Persist the exam the user just built if it has no id yet
    if (!currentExamId) {
      try {
        const examData = {
          title: examTitle,
          subject: selectedSubject || 'General',
          grade: selectedGrade,
          questions: examQuestions,
          createdBy: currentUser?.uid || 'guest',
          createdAt: Date.now(),
          source: 'custom' as const
        };
        
        await persistNewExam(examData);
      } catch (e) {
        console.error(e);
      }
    }
    
    setView('EXAM');
  };

  const handleFinishExam = async (answers: Record<string, string> = {}) => {
    setUserAnswers(answers);
    const graded = gradeExam(examQuestions, answers);
    const startedAt = startTime || Date.now();
    const duration = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    // Reuse the id of an attempt that was already saved as IN_PROGRESS, so
    // finishing it updates that row instead of leaving a duplicate behind.
    const newSessionId = currentSessionId || `session_${Date.now()}`;
    const resolvedExamId = currentExamId || 'exam_local';
    const userId = currentUser?.uid || 'guest';

    setLastResult({
      score: graded.correct,
      total: graded.graded,
      percentage: graded.percentage,
      duration,
      completedAt: Date.now(),
    });

    // Answers are stored with the session so results can be reviewed later.
    try {
      await saveSessionLocally({
        id: newSessionId,
        examId: resolvedExamId,
        userId,
        status: 'COMPLETED',
        score: graded.correct,
        total: graded.graded,
        percentage: graded.percentage,
        startTime: startedAt,
        timeLimit: timeLimit || 0,
        timeSpent: duration,
        lastUpdated: Date.now(),
        syncedWithCloud: false,
        answers,
      });
    } catch (e) {
      console.warn('Could not persist the exam session locally:', e);
    }

    const canWriteCloud =
      Boolean(currentUser) &&
      isOnline &&
      isFirebaseAuthed &&
      Boolean(auth.currentUser) &&
      auth.currentUser!.uid === currentUser!.uid;

    if (canWriteCloud) {
      // Deterministic id keeps the local and cloud copies of one attempt in
      // sync. The write is bounded so a stalled backend cannot stop the
      // student from seeing their results; the local copy is already saved and
      // the offline queue replays it on reconnect.
      void runWithTimeout(
        () =>
          setDoc(doc(db, 'user_exams', newSessionId), {
            examId: resolvedExamId,
            userId: userId,
            status: 'COMPLETED',
            answers,
            score: graded.correct,
            total: graded.graded,
            totalQuestions: graded.total,
            percentage: graded.percentage,
            startTime: startedAt,
            timeLimit: timeLimit || 0,
            duration,
            lastUpdated: serverTimestamp(),
          }),
        CRITICAL_WRITE_TIMEOUT_MS
      );
    }

    setCurrentSessionId(newSessionId);

    try {
      localStorage.removeItem('euee_active_exam_state');
      localStorage.removeItem(getExamProgressKey(currentExamId, examTitle));
    } catch {}

    setView('SUMMARY');
  };

  const handleExitExam = async (answers: Record<string, string> = {}) => {
    // Keep an in-progress session so "Continue" on the dashboard is real.
    if (saveProgress && currentExamId && examQuestions.length > 0) {
      const sessionId = currentSessionId || `session_${Date.now()}`;
      try {
        await saveSessionLocally({
          id: sessionId,
          examId: currentExamId,
          userId: currentUser?.uid || 'guest',
          status: 'IN_PROGRESS',
          answers,
          startTime: startTime || Date.now(),
          timeLimit: timeLimit || 0,
          lastUpdated: Date.now(),
          syncedWithCloud: false,
        });
        setCurrentSessionId(sessionId);
      } catch (e) {
        console.warn('Could not save the in-progress session:', e);
      }
    }
    setView('DASHBOARD');
  };

  const handleSelectExam = (exam: any) => {
    if (!exam || !exam.questions || exam.questions.length === 0) {
      setErrorMessage("Selected exam contains no valid questions.");
      return;
    }
    setExamQuestions(exam.questions);
    setExamTitle(exam.title || 'National Exam');
    setSelectedSubject(exam.subject || 'General');
    setSelectedGrade(exam.grade || 'Grade 12');
    setCurrentExamId(exam.id || `exam_${Date.now()}`);
    setOriginalExam(exam);
    setRecommendedTimeLimit(typeof exam.timeLimit === 'number' && exam.timeLimit > 0 ? exam.timeLimit : null);
    // A fresh attempt must never show the previous attempt's answers.
    setUserAnswers({});
    setCurrentSessionId(null);
    setTimeLimit(null);
    setView('TIMER_SELECTION');
  };

  const handleContinueSession = (exam: any, session: any) => {
    if (!exam) return;
    setExamQuestions(exam.questions || []);
    setExamTitle(exam.title || 'Exam Session');
    setSelectedSubject(exam.subject || 'General');
    setSelectedGrade(exam.grade || 'Grade 12');
    setCurrentExamId(exam.id);
    setOriginalExam(exam);
    setRecommendedTimeLimit(typeof exam.timeLimit === 'number' && exam.timeLimit > 0 ? exam.timeLimit : null);
    setTimeLimit(session?.timeLimit || null);
    setUserAnswers(session?.answers || {});
    // Resuming keeps the original start time so the remaining time is honest.
    setStartTime(session?.startTime || Date.now());
    setCurrentSessionId(session?.id);
    // A resumed attempt whose clock already ran out must not silently restart.
    if (session?.timeLimit > 0) {
      const remaining = session.timeLimit - Math.floor((Date.now() - (session.startTime || Date.now())) / 1000);
      if (remaining <= 0) {
        setErrorMessage(
          'The time limit for that session has already ended, so it has been graded with the answers you saved.'
        );
        const graded = gradeExam(exam.questions || [], session.answers || {});
        setLastResult({
          score: graded.correct,
          total: graded.graded,
          percentage: graded.percentage,
          duration: session.timeLimit,
          completedAt: Date.now(),
        });
        setUserAnswers(session.answers || {});
        setView('SUMMARY');
        return;
      }
    }
    setView('EXAM');
  };

  const handleViewSummarySession = (exam: any, session: any) => {
    if (!exam) return;
    const questions = exam.questions || [];
    const answers = session?.answers || {};
    const graded = gradeExam(questions, answers);
    setExamQuestions(questions);
    setExamTitle(exam.title || 'Exam Summary');
    setOriginalExam(exam);
    setUserAnswers(answers);
    setLastResult({
      score: graded.correct,
      total: graded.graded,
      percentage: graded.percentage,
      duration: session?.timeSpent || session?.duration || 0,
      completedAt: session?.lastUpdated || Date.now(),
    });
    setView('SUMMARY');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="w-8 h-8 animate-spin text-[#8AB4F8]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <Header
        currentUser={currentUser}
        onLogout={() => {
          logout();
          setIsGuestMode(false);
          localStorage.removeItem('onboarded');
          localStorage.removeItem('euee_initial_setup_completed');
          setView('UPLOAD');
        }}
        onDashboard={() => setView('DASHBOARD')}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDarkMode={isDarkMode}
        showNav={Boolean(currentUser) || isGuestMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
        onSignIn={() => {
           setIsGuestMode(false);
           setView('UPLOAD');
        }}
        onGoogleSignIn={loginWithGoogle}
      />
      
      <OfflineBanner />

      <main className="flex-1 overflow-x-hidden relative">
        <AnimatePresence mode="wait">
          {view === 'UPLOAD' && (!currentUser && !isGuestMode) && (
            <LandingPage
              key="landing"
              onGuestMode={() => {
                setIsGuestMode(true);
                setView('DASHBOARD');
              }}
            />
          )}

          {view === 'DASHBOARD' && activeTab === 'HOME' && (currentUser || isGuestMode) && (
            <Home
              key="home"
              onContinue={handleContinueSession}
              onRetake={handleSelectExam}
              onViewSummary={handleViewSummarySession}
              onUpload={handleFileUpload}
              onProcessText={handleTextSubmit}
              onImportExam={handleImportExam}
              isParsing={isParsing}
            />
          )}
          
          {view === 'SUBJECT_DETAIL' && activeTab === 'HOME' && selectedSubject && (
            <SubjectDetail
              key="subject_detail"
              subject={selectedSubject || ''}
              onBack={() => setView('DASHBOARD')}
              onContinue={handleContinueSession}
              onRetake={handleSelectExam}
              onViewSummary={handleViewSummarySession}
              onUpload={handleFileUpload}
              onProcessText={handleTextSubmit}
              isParsing={isParsing}
            />
          )}

          {view === 'DASHBOARD' && activeTab === 'MY_EXAM' && (currentUser || isGuestMode) && (
            <Dashboard 
              key="dashboard" 
              onContinue={handleContinueSession} 
              onRetake={handleSelectExam} 
              onViewSummary={handleViewSummarySession} 
              onSelectSubject={(subj) => { setSelectedSubject(subj); setView('SUBJECT_DETAIL'); }} 
              onUpload={handleFileUpload}
              onProcessText={handleTextSubmit}
              onImportExam={handleImportExam}
              isParsing={isParsing}
            />
          )}

          {view === 'TIMER_SELECTION' && (
            <TimerSelection
              key="timer"
              onSelect={handleTimerSelection}
              currentUser={currentUser}
              recommendedSeconds={recommendedTimeLimit}
              examTitle={examTitle}
              onSignIn={() => {
                setIsGuestMode(false);
                setView('UPLOAD');
              }}
            />
          )}

          {view === 'EXAM' && (
            <ExamInterface
              key="exam"
              questions={examQuestions}
              timeLimit={timeLimit || 0}
              examId={currentExamId}
              onComplete={handleFinishExam}
              onBack={handleExitExam}
              saveAnswer={(qId, ans) => setUserAnswers(prev => ({...prev, [qId]: ans}))}
              initialAnswers={userAnswers}
              startTime={startTime || Date.now()}
              examTitle={examTitle}
              subject={selectedSubject || 'General'}
              grade={selectedGrade || 'General'}
              saveProgress={saveProgress}
              isDarkMode={isDarkMode}
            />
          )}

          {view === 'SUMMARY' && (
            <SummaryPage
              key="summary"
              questions={examQuestions}
              userAnswers={userAnswers}
              title={examTitle}
              timeSpentSeconds={lastResult?.duration}
              onReviewMissed={() => {
                const source = originalExam?.questions || examQuestions;
                // Only questions that carry a real answer key can be "missed";
                // ungraded practice questions must never be drilled as mistakes.
                const missed = source.filter((q: Question) => {
                  const correct = getCorrectAnswer(q);
                  if (correct === undefined) return false;
                  return userAnswers[q.id] !== correct;
                });
                if (missed.length === 0) return;
                setExamQuestions(missed);
                setExamTitle(`${examTitle} — ${t('reviewMissed')}`);
                setUserAnswers(
                  Object.fromEntries(
                    Object.entries(userAnswers).filter(([id]) => missed.some((q: Question) => q.id === id))
                  )
                );
                setCurrentExamId(`${currentExamId || 'exam'}_missed_${Date.now()}`);
                setTimeLimit(null);
                setRecommendedTimeLimit(null);
                setStartTime(Date.now());
                setSaveProgress(false);
                setLastResult(null);
                setView('TIMER_SELECTION');
              }}
              onRetake={() => {
                if (originalExam) {
                  handleSelectExam(originalExam);
                } else {
                  setView('DASHBOARD');
                }
              }}
              onReset={() => {
                // Leaving the summary must not leave a stale paper behind: a
                // later retake would otherwise inherit its id and answers.
                setOriginalExam(null);
                setExamQuestions([]);
                setUserAnswers({});
                setLastResult(null);
                setCurrentExamId(null);
                setCurrentSessionId(null);
                setTimeLimit(null);
                setStartTime(null);
                setView('DASHBOARD');
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {errorMessage && (
            (() => {
              const isBusy = /busy|high traffic|capacity|rate limit|quota|temporarily unavailable/i.test(errorMessage);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 40, scale: 0.95 }}
                  className={`fixed bottom-5 right-5 p-4 sm:p-5 rounded-2xl shadow-2xl max-w-md z-50 border backdrop-blur-md ${
                    isBusy
                      ? 'bg-[#1e3a8a]/95 border-[#8AB4F8]/50 text-blue-50'
                      : 'bg-red-600/95 border-red-400/40 text-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${isBusy ? 'bg-[#8AB4F8]/20 text-[#8AB4F8]' : 'bg-white/10 text-white'}`}>
                      {isBusy ? <Info className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm">
                        {isBusy ? t('aiHighTrafficNotice') : t('notice')}
                      </h3>
                      <p className="text-xs opacity-90 mt-1 leading-relaxed">{errorMessage}</p>
                      {isBusy && (
                        <p className="text-[11px] text-blue-200/80 mt-1.5 font-medium">{t('aiBusyTip')}</p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        {isBusy && (
                          <button
                            onClick={() => {
                              setErrorMessage(null);
                              setView('DASHBOARD');
                            }}
                            className="text-xs bg-[#8AB4F8] text-gray-900 font-bold px-3 py-1.5 rounded-xl hover:bg-[#AECBFA] transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            {t('backToMyExams')}
                          </button>
                        )}
                        <button
                          onClick={() => setErrorMessage(null)}
                          className={`text-xs px-2.5 py-1.5 rounded-xl transition-colors ${
                            isBusy
                              ? 'bg-white/10 hover:bg-white/20 text-blue-100'
                              : 'bg-white/20 hover:bg-white/30 text-white'
                          }`}
                        >
                          {t('dismiss')}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showOnboarding && (
            <InitialSetupModal
              isOpen={showOnboarding}
              isDarkMode={isDarkMode}
              onSetTheme={(isDark) => setIsDarkMode(isDark)}
              onContinueAsGuest={handleGuestModeFromOnboarding}
              onSignIn={handleSignInFromOnboarding}
              onClose={handleDismissOnboarding}
            />
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <OfflineProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </OfflineProvider>
    </LanguageProvider>
  );
}
