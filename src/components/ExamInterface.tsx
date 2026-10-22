import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Circle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Flag, 
  Menu, 
  AlertTriangle,
  X,
  ZoomIn,
  Minus,
  Plus,
  RotateCcw,
  Info,
  Layers,
  Compass,
  BookOpen,
  Maximize,
  Minimize,
  LogOut,
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Question } from '../services/geminiService';
import LatexText from './LatexText';
import { useLanguage } from '../contexts/LanguageContext';
import { formatClock, computeDeadline, remainingSeconds } from '../lib/time';
import { getExamProgressKey } from '../lib/examProgress';

interface ExamInterfaceProps {
  questions: Question[];
  onComplete: (answers?: Record<string, string>) => void;
  onBack: (answers?: Record<string, string>) => void;
  saveAnswer: (questionId: string, answer: string) => void;
  initialAnswers?: Record<string, string>;
  startTime: number;
  timeLimit: number;
  examId?: string | null;
  examTitle: string;
  subject: string;
  grade: string;
  saveProgress: boolean;
  isDarkMode: boolean;
}

export default function ExamInterface({ 
  questions, 
  onComplete, 
  onBack,
  saveAnswer, 
  initialAnswers = {},
  startTime,
  timeLimit,
  examId,
  examTitle,
  subject,
  grade,
  saveProgress
}: ExamInterfaceProps) {
  const { t } = useLanguage();
  // Progress is keyed by the exam identity (never by title alone) so that a
  // retake of the same paper can never resurrect the previous attempt's choices.
  const storageKey = useMemo(() => getExamProgressKey(examId, examTitle), [examId, examTitle]);
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const sideOverviewRef = useRef<HTMLElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        (document.documentElement as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  // A deadline is derived from startTime + timeLimit. `null` means untimed.
  const [deadline, setDeadline] = useState<number | null>(() => computeDeadline(startTime, timeLimit));
  const [timeLeft, setTimeLeft] = useState<number>(() =>
    remainingSeconds(computeDeadline(startTime, timeLimit)) ?? 0
  );

  const savedProgress = useMemo(() => {
    if (!saveProgress) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed as {
        currentIndex?: number;
        selectedAnswers?: Record<string, string>;
        flaggedQuestions?: number[];
        deadline?: number | null;
      };
    } catch {
      return null;
    }
  }, [storageKey, saveProgress]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = savedProgress?.currentIndex;
    if (typeof saved !== 'number' || !Number.isInteger(saved)) return 0;
    return Math.min(Math.max(0, saved), Math.max(0, questions.length - 1));
  });

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(
    () => ({ ...initialAnswers, ...(savedProgress?.selectedAnswers || {}) })
  );

  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(
    () => new Set(Array.isArray(savedProgress?.flaggedQuestions) ? savedProgress!.flaggedQuestions : [])
  );

  // Restore the absolute deadline saved with the attempt (survives refresh)
  useEffect(() => {
    const savedDeadline = savedProgress?.deadline;
    if (typeof savedDeadline === 'number' && savedDeadline > 0 && timeLimit > 0) {
      setDeadline(savedDeadline);
      setTimeLeft(remainingSeconds(savedDeadline) ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  const hasSubmittedRef = useRef(false);
  const answersRef = useRef(selectedAnswers);
  answersRef.current = selectedAnswers;

  // Close the Zoom slider when clicking anywhere outside it.
  useEffect(() => {
    if (!showZoomSlider) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (zoomContainerRef.current && !zoomContainerRef.current.contains(e.target as Node)) {
        setShowZoomSlider(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showZoomSlider]);

  // Keyboard Navigation (arrows navigate, A-D / 1-4 select an option)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSubmitModal || showExitModal) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      // Never hijack browser/system shortcuts (Ctrl+F, Cmd+A, Alt+← …).
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toUpperCase();
      const optionIndex = /^[A-E]$/.test(key)
        ? key.charCodeAt(0) - 65
        : /^[1-5]$/.test(key)
          ? Number(key) - 1
          : -1;
      if (optionIndex >= 0) {
        const option = questions[currentIndex]?.options?.[optionIndex];
        if (option !== undefined) {
          e.preventDefault();
          handleOptionSelectRef.current(option);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, questions, showSubmitModal, showExitModal]);

  // Auto-scroll active question in the side Exam Overview sidebar
  useEffect(() => {
    if (!sideOverviewRef.current) return;
    const activeEl = sideOverviewRef.current.querySelector(`[data-overview-idx="${currentIndex}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentIndex]);

  // With progress saving OFF the attempt genuinely cannot be resumed, so an
  // accidental refresh or closed tab would silently destroy every answer. The
  // browser's own "leave site?" prompt is the only honest warning available.
  useEffect(() => {
    if (saveProgress) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (hasSubmittedRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [saveProgress]);

  // Auto-save to LocalStorage with quota & security error protection
  useEffect(() => {
    if (!saveProgress) return;
    try {
      const stateToSave = {
        currentIndex,
        selectedAnswers,
        flaggedQuestions: Array.from(flaggedQuestions),
        deadline,
        timeLimit,
        startTime,
        lastSaved: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (storageError) {
      console.warn("Could not auto-save exam progress to localStorage (e.g. private mode or storage quota):", storageError);
    }
  }, [currentIndex, selectedAnswers, flaggedQuestions, deadline, timeLimit, startTime, storageKey, saveProgress]);

  // Timer Logic — always recomputed from the absolute deadline so that
  // throttled background tabs and sleep cannot stretch the exam clock.
  useEffect(() => {
    if (deadline === null) {
      setTimeLeft(0);
      return;
    }
    const tick = () => setTimeLeft(remainingSeconds(deadline) ?? 0);
    tick();
    const timer = window.setInterval(tick, 500);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [deadline]);

  const isUntimed = deadline === null;

  // Auto-submit exactly once when the countdown reaches zero
  useEffect(() => {
    if (isUntimed || timeLeft > 0 || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    onComplete(answersRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isUntimed]);

  // The countdown itself updates every second, so it must never be a live
  // region — screen readers would interrupt the student endlessly. Only the
  // milestones are spoken.
  const [timeNotice, setTimeNotice] = useState('');
  useEffect(() => {
    if (isUntimed) return;
    if (timeLeft === 300) setTimeNotice(t('fiveMinutesLeft'));
    else if (timeLeft === 60) setTimeNotice(t('oneMinuteLeft'));
    else if (timeLeft === 0) setTimeNotice(t('timeUp'));
  }, [timeLeft, isUntimed, t]);

  const formatTime = formatClock;

  const handleOptionSelect = (option: string) => {
    const currentQuestion = questions ? questions[currentIndex] : undefined;
    if (!currentQuestion || !currentQuestion.id) return;
    setSelectedAnswers(prev => ({ ...prev, [currentQuestion.id]: option }));
    // Always update parent state
    saveAnswer(currentQuestion.id, option);
  };
  const handleOptionSelectRef = useRef(handleOptionSelect);
  handleOptionSelectRef.current = handleOptionSelect;

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowSubmitModal(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setShowSubmitModal(false);
    onComplete(selectedAnswers);
  };

  const handleExit = () => {
    setShowExitModal(false);
    onBack(selectedAnswers);
  };

  const toggleFlag = () => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  };

  // Warn before leaving/refreshing mid-exam so answers are not lost silently
  useEffect(() => {
    if (hasSubmittedRef.current) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const [showBlockDirections, setShowBlockDirections] = useState(false);

  // Reset showBlockDirections whenever question changes
  useEffect(() => {
    setShowBlockDirections(false);
  }, [currentIndex]);

  const currentQuestion = questions ? questions[currentIndex] : undefined;

  // Helper: get the section for a question index
  const getSectionForIndex = (idx: number): string | undefined => {
    if (!questions || idx < 0 || idx >= questions.length) return undefined;
    if (questions[idx]?.section && questions[idx].section!.trim().length > 0) {
      return questions[idx].section!.trim();
    }
    for (let i = idx - 1; i >= 0; i--) {
      if (questions[i]?.section && questions[i].section!.trim().length > 0) {
        return questions[i].section!.trim();
      }
    }
    return undefined;
  };

  // Helper: get the effective instruction text for a question index
  const getEffectiveInstruction = (idx: number): string | undefined => {
    if (!questions || idx < 0 || idx >= questions.length) return undefined;
    if (questions[idx]?.instruction && questions[idx].instruction!.trim().length > 0) {
      return questions[idx].instruction!.trim();
    }
    const sec = getSectionForIndex(idx);
    for (let i = idx - 1; i >= 0; i--) {
      if (questions[i]?.instruction && questions[i].instruction!.trim().length > 0) {
        const prevSec = getSectionForIndex(i);
        if (sec && prevSec && sec.toLowerCase() !== prevSec.toLowerCase()) {
          break; // Section boundary crossed
        }
        return questions[i].instruction!.trim();
      }
    }
    return undefined;
  };

  // Derive active section for the current question
  const activeSection = useMemo(() => {
    return getSectionForIndex(currentIndex);
  }, [questions, currentIndex]);

  // Derive effective instruction for current question
  const effectiveInstruction = useMemo(() => {
    return getEffectiveInstruction(currentIndex);
  }, [questions, currentIndex]);

  // Derive active instruction: ONLY show on the FIRST question of that instruction block!
  const isFirstQuestionOfInstructionBlock = useMemo(() => {
    if (!effectiveInstruction) return false;
    if (currentIndex === 0) return true;
    const prevInstr = getEffectiveInstruction(currentIndex - 1);
    return effectiveInstruction !== prevInstr;
  }, [questions, currentIndex, effectiveInstruction]);

  const activeInstruction = useMemo(() => {
    if (isFirstQuestionOfInstructionBlock) {
      return effectiveInstruction;
    }
    return undefined;
  }, [isFirstQuestionOfInstructionBlock, effectiveInstruction]);

  // Derive active reading passage: KEEPS the passage displayed for ALL questions belonging to that passage!
  const activePassage = useMemo(() => {
    if (currentQuestion?.passage && currentQuestion.passage.trim().length > 0) {
      return currentQuestion.passage.trim();
    }
    // Search backward in the questions list for an active passage within the current reading section
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (questions[i]?.passage && questions[i].passage!.trim().length > 0) {
        const prevSec = getSectionForIndex(i);
        const currSec = getSectionForIndex(currentIndex);
        if (prevSec && currSec && prevSec.toLowerCase() !== currSec.toLowerCase()) {
          break; // Section changed
        }
        // Check if there was an explicit non-reading instruction between i and currentIndex
        let nonReadingFound = false;
        for (let j = i + 1; j <= currentIndex; j++) {
          if (
            questions[j]?.instruction &&
            /vocabulary|grammar|analogy|antonym|synonym|solve each|mathematical|quantitative|dialogue/i.test(
              questions[j].instruction!
            )
          ) {
            nonReadingFound = true;
            break;
          }
        }
        if (nonReadingFound) break;
        return questions[i].passage!.trim();
      }
    }
    return undefined;
  }, [questions, currentIndex, currentQuestion]);

  const questionSpecificContext = useMemo(() => {
    if (!currentQuestion?.context) return undefined;
    if (currentQuestion.context === activeInstruction || currentQuestion.context === activePassage) {
      return undefined;
    }
    return currentQuestion.context;
  }, [currentQuestion, activeInstruction, activePassage]);

  if (!questions || questions.length === 0 || !currentQuestion) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] p-6">
        <AlertTriangle className="w-12 h-12 text-yellow-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">{t('noQuestionsFound')}</h2>
        <p className="text-[var(--text-secondary)] mb-6 text-center max-w-sm leading-relaxed">
          {t('noQuestionsFoundDesc')}
        </p>
        <button
          onClick={() => onBack(answersRef.current)}
          className="bg-[#8AB4F8] text-gray-900 px-6 py-2.5 rounded-xl font-bold hover:bg-[#AECBFA] transition-all"
        >
          {t('backToDashboard')}
        </button>
      </div>
    );
  }

  const isWarningTime = !isUntimed && timeLeft <= 300; // 5 minutes

  // Used by the submit dialog to point at the first skipped question.
  const unansweredIndexes = questions
    .map((question, index) => (selectedAnswers[question.id] ? -1 : index))
    .filter((index) => index >= 0);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden transition-colors duration-300">
      {/* Main 3-Column Layout */}
      <div className="flex flex-col xl:flex-row flex-1 overflow-hidden">
        {/* Column 1: Question Information (Left) */}
        <aside className="xl:w-52 border-r border-[var(--border-color)] p-4 xl:p-6 bg-[var(--bg-accent)] flex-shrink-0">
          <div className="flex xl:flex-col gap-4 sticky top-6">
            <div className="flex-1 xl:flex-none bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 xl:p-6 text-center shadow-xs">
              <span className="text-2xl xl:text-3xl font-black text-[var(--text-primary)]">Q{currentIndex + 1}</span>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mt-1 font-semibold">of {questions.length}</p>
              {activeSection && (
                <div className="mt-3 pt-3 border-t border-[var(--border-color)] hidden xl:block">
                  <span className="text-[11px] font-bold text-[#3b82f6] dark:text-[#8AB4F8] leading-tight line-clamp-2">
                    {activeSection}
                  </span>
                </div>
              )}
            </div>
            
            <button 
              onClick={toggleFlag}
              className={`flex-1 xl:flex-none flex items-center justify-center gap-2 py-3 xl:py-4 rounded-xl border transition-all font-bold text-sm shadow-xs ${
                flaggedQuestions.has(currentIndex)
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Flag className={`w-4 h-4 ${flaggedQuestions.has(currentIndex) ? 'fill-current' : ''}`} />
              {t('flag')}
            </button>
          </div>
        </aside>

        {/* Column 2: Main Question Area (Center) */}
        <main className="flex-1 overflow-y-auto pt-4 px-4 pb-0 md:pt-6 md:px-8 xl:pt-8 xl:px-12 bg-[var(--bg-primary)]">
          <div className="max-w-3xl mx-auto flex flex-col min-h-full">
            {/* Top Bar: Exit, Zoom, Full Screen & Timer */}
            <div className="sticky top-0 z-20 flex justify-between items-center mb-4 gap-2 sm:gap-3 py-2.5 px-2 bg-[var(--bg-primary)]/90 backdrop-blur-md rounded-b-2xl border-b border-[var(--border-color)]">
              <div className="flex items-center gap-1.5 sm:gap-2 relative" ref={zoomContainerRef}>
                <button 
                  onClick={() => setShowExitModal(true)}
                  className="flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 sm:px-4 py-2 rounded-2xl shadow-xs hover:bg-[var(--card-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-xs sm:text-sm"
                  title={t('exitExamTitle')}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t('exit')}</span>
                </button>
                
                {/* Zoom control (the slider opens on demand) */}
                <div className="relative">
                  <button
                    onClick={() => setShowZoomSlider(prev => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border transition-all shadow-xs text-xs font-bold ${
                      showZoomSlider || zoomLevel !== 1
                        ? 'bg-[#8AB4F8]/15 border-[#8AB4F8]/50 text-[#3b82f6] dark:text-[#8AB4F8]' 
                        : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]'
                    }`}
                    title={t('zoomHowToUse')}
                  >
                    <ZoomIn className="w-4 h-4" />
                    <span>{Math.round(zoomLevel * 100)}%</span>
                  </button>

                  <AnimatePresence>
                    {showZoomSlider && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute top-full left-0 mt-3 p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl z-50 w-72 md:w-80 origin-top-left text-left"
                      >
                        {/* Slider Controls */}
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setZoomLevel(prev => Math.max(0.6, parseFloat((prev - 0.1).toFixed(1))))} 
                            className="p-2 rounded-xl bg-[var(--bg-accent)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] transition-colors"
                            title={t('decreaseTextSize')}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          
                          <input 
                            type="range" 
                            min="0.6" 
                            max="1.8" 
                            step="0.1" 
                            value={zoomLevel} 
                            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                            className="flex-1 accent-[#8AB4F8] cursor-pointer h-2 bg-[var(--bg-accent)] rounded-lg" 
                          />
                          
                          <button 
                            onClick={() => setZoomLevel(prev => Math.min(1.8, parseFloat((prev + 0.1).toFixed(1))))} 
                            className="p-2 rounded-xl bg-[var(--bg-accent)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] transition-colors"
                            title={t('increaseTextSize')}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Preset Quick Buttons */}
                        <div className="flex items-center gap-1.5 justify-between pt-3 border-t border-[var(--border-color)]">
                          {[0.8, 1, 1.2, 1.4].map(val => (
                            <button
                              key={val}
                              onClick={() => setZoomLevel(val)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                zoomLevel === val 
                                  ? 'bg-[#8AB4F8] text-gray-900' 
                                  : 'bg-[var(--bg-accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                              }`}
                            >
                              {Math.round(val * 100)}%
                            </button>
                          ))}
                          <button
                            onClick={() => setZoomLevel(1)}
                            className="p-1.5 rounded-lg bg-[var(--bg-accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors"
                            title={t('resetZoom')}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="mt-3 text-center">
                          <span className="text-[10px] font-medium text-[var(--text-secondary)] opacity-70">
                            {t('clickAnywhereToClose')}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Full Screen Toggle Button */}
                <button
                  type="button"
                  onClick={toggleFullScreen}
                  className="p-2 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#8AB4F8]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center text-xs shadow-xs"
                  title={isFullScreen ? t('exitFullScreen') : t('fullScreen')}
                  aria-label={isFullScreen ? t('exitFullScreen') : t('fullScreen')}
                >
                  {isFullScreen ? <Minimize className="w-4 h-4 text-[#8AB4F8]" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Which paper am I writing? The title and folder belong on screen. */}
              <div className="hidden md:flex flex-col items-end min-w-0 px-2">
                <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[22rem]">
                  {examTitle}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-semibold">
                  {[subject, grade && grade !== 'General' ? grade : null].filter(Boolean).join(' · ')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 sm:px-4 py-2 rounded-2xl shadow-xs"
                  role="timer"
                  aria-live="off"
                >
                  <Clock className={`w-4 h-4 ${isWarningTime ? 'text-red-500 animate-pulse' : 'text-[#3b82f6] dark:text-[#8AB4F8]'}`} />
                  <span className={`font-mono text-xs sm:text-sm font-bold ${isWarningTime ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                    {isUntimed ? t('untimed') : formatTime(timeLeft)}
                  </span>
                </div>
                <span className="sr-only" role="status" aria-live="polite">{timeNotice}</span>
              </div>
            </div>

            {/* Question Box */}
            <div 
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 xl:p-10 mb-8 shadow-sm transition-all origin-top"
              style={{ zoom: zoomLevel } as React.CSSProperties}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.18 }}
                >
                  {/* Section Badge and Optional Directions Toggle */}
                  <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                    {activeSection && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#8AB4F8]/10 text-[#3b82f6] dark:text-[#8AB4F8] border border-[#8AB4F8]/20 rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{activeSection}</span>
                      </span>
                    )}

                    {/* If instruction is not shown by default on questions 2+, provide a clean toggle if student wants to review */}
                    {!activeInstruction && effectiveInstruction && (
                      <button
                        type="button"
                        onClick={() => setShowBlockDirections(prev => !prev)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer"
                        title={showBlockDirections ? t('hideDirections') : t('viewDirections')}
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>{showBlockDirections ? t('hideDirections') : t('viewDirections')}</span>
                      </button>
                    )}
                  </div>

                  {/* Instructions / Directions Box - Shown on the FIRST question of the instruction block, or toggled on */}
                  {(activeInstruction || (showBlockDirections && effectiveInstruction)) && (
                    <div className="w-full mb-6 p-4 sm:p-5 bg-amber-500/10 border-l-4 border-amber-500 dark:border-amber-400 rounded-r-2xl text-[var(--text-primary)] shadow-xs transition-all">
                      <div className="flex items-center justify-between gap-2 mb-1.5 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        <div className="flex items-center gap-2">
                          <Compass className="w-4 h-4 shrink-0" />
                          <span>{t('instructions')}</span>
                        </div>
                        {!activeInstruction && (
                          <button
                            type="button"
                            onClick={() => setShowBlockDirections(false)}
                            className="text-[11px] font-semibold text-amber-600/80 dark:text-amber-400/80 hover:text-amber-600 hover:underline cursor-pointer"
                          >
                            {t('hideDirections')}
                          </button>
                        )}
                      </div>
                      <div className="text-sm md:text-base font-medium leading-relaxed">
                        <LatexText text={activeInstruction || effectiveInstruction || ''} />
                      </div>
                    </div>
                  )}

                  {/* Reading Passage Box - KEEPS for all questions belonging to this passage */}
                  {activePassage && (
                    <div className="w-full mb-6 p-5 sm:p-6 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl shadow-xs">
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#3b82f6] dark:text-[#8AB4F8]">
                          <BookOpen className="w-4 h-4 shrink-0" />
                          <span>{t('readingPassage')}</span>
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2.5 py-0.5 rounded-full border border-[var(--border-color)]">
                          Reference Text
                        </span>
                      </div>
                      <div className="text-sm md:text-base text-[var(--text-primary)] leading-relaxed font-serif whitespace-pre-wrap">
                        <LatexText text={activePassage} />
                      </div>
                    </div>
                  )}

                  {/* Single-Question Context Box */}
                  {questionSpecificContext && (
                    <div className="w-full mb-6 p-4 sm:p-5 bg-[var(--context-box-bg)] border-l-4 border-[var(--context-box-border)] rounded-r-2xl text-[var(--text-primary)] italic text-sm md:text-base font-normal whitespace-pre-wrap leading-relaxed shadow-xs">
                      <div className="flex items-center gap-1.5 text-xs font-bold not-italic mb-1.5 text-[var(--text-secondary)]">
                        <Info className="w-3.5 h-3.5" />
                        <span>{t('contextDataLabel')}</span>
                      </div>
                      <LatexText text={questionSpecificContext} />
                    </div>
                  )}

                  {/* Question Heading */}
                  <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-6 md:mb-8 leading-snug tracking-tight whitespace-pre-wrap">
                    <LatexText text={currentQuestion?.question || t('questionUnavailable')} />
                  </h2>

                  {/* Options */}
                  <div className="space-y-3 md:space-y-4">
                    {(currentQuestion?.options || []).map((option, index) => {
                      const isSelected = currentQuestion ? selectedAnswers[currentQuestion.id] === option : false;
                      const letter = String.fromCharCode(65 + index);
                      return (
                        <button
                          key={`${currentQuestion?.id ?? 'q'}-${index}`}
                          onClick={() => handleOptionSelect(option)}
                          className={`w-full flex items-center gap-4 p-4 md:p-5 min-h-[64px] rounded-2xl border-2 transition-all duration-200 ease-in-out text-left group break-words whitespace-normal shadow-xs ${
                            isSelected 
                              ? 'border-[#8AB4F8] bg-[#8AB4F8]/10 text-[var(--text-primary)] ring-2 ring-[#8AB4F8]/20' 
                              : 'border-[var(--option-border)] bg-[var(--option-bg)] text-[var(--text-primary)] hover:border-[#8AB4F8]/50 hover:bg-[var(--option-hover-bg)]'
                          }`}
                        >
                          <div className="flex-shrink-0 flex items-center gap-3 md:gap-4">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                              isSelected 
                                ? 'bg-[#8AB4F8] text-gray-900 font-extrabold shadow-xs' 
                                : 'bg-[var(--bg-accent)] text-[var(--text-secondary)] border border-[var(--border-color)] group-hover:border-[#8AB4F8]/40'
                            }`}>
                              {letter}
                            </div>
                            {isSelected ? (
                              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-[#3b82f6] dark:text-[#8AB4F8]" />
                            ) : (
                              <Circle className="w-5 h-5 md:w-6 md:h-6 text-[var(--text-secondary)] opacity-40 group-hover:opacity-70 group-hover:text-[#8AB4F8]" />
                            )}
                          </div>
                          <span className="text-base md:text-lg font-medium flex-1 break-words whitespace-normal">
                            <LatexText text={option} />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Immediate Navigation Controls directly below Question */}
                  <div 
                    className="mt-6 md:mt-8 pt-5 md:pt-6 border-t border-[var(--border-color)] flex items-center justify-between gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap"
                  >
                    {/* Mobile Overview Menu Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(true)}
                      className="xl:hidden flex items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-accent)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] transition-all shadow-xs shrink-0 p-3 min-h-[46px]"
                      title={t('examOverview')}
                      aria-label={t('examOverview')}
                    >
                      <Menu className="w-5 h-5" />
                    </button>

                    {/* Previous Button */}
                    <button
                      type="button"
                      onClick={handlePrevious}
                      disabled={currentIndex === 0}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 sm:px-5 rounded-2xl font-bold transition-all border shadow-xs min-h-[48px] text-sm md:text-base ${
                        currentIndex === 0 
                          ? 'border-[var(--border-color)] bg-[var(--bg-accent)]/50 text-[var(--text-secondary)]/40 cursor-not-allowed' 
                          : 'border-[var(--border-color)] bg-[var(--bg-accent)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] hover:border-[#8AB4F8]/40'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                      <span>{t('previous')}</span>
                    </button>

                    {/* Next / Finish Button */}
                    <button
                      type="button"
                      onClick={handleNext}
                      className={`flex-[1.4] sm:flex-[1.6] flex items-center justify-center gap-2 py-3 px-5 sm:px-6 rounded-2xl font-bold transition-all shadow-md min-h-[48px] text-sm md:text-base cursor-pointer ${
                        currentIndex === questions.length - 1
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                          : 'bg-[#8AB4F8] text-gray-900 hover:bg-[#AECBFA] shadow-[#8AB4F8]/20 hover:shadow-[#8AB4F8]/40'
                      }`}
                    >
                      <span>{currentIndex === questions.length - 1 ? t('finish') : t('next')}</span>
                      {currentIndex !== questions.length - 1 && (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* Column 3: Exam Overview */}
        {isMenuOpen && (
          <div 
            className="xl:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
        <aside 
          ref={sideOverviewRef}
          className={`
          fixed inset-y-0 right-0 z-[101] w-[85%] max-w-sm transform transition-transform duration-300 ease-in-out
          xl:relative xl:w-72 xl:transform-none xl:z-auto xl:flex
          border-l border-[var(--border-color)] bg-[var(--bg-secondary)] flex-col shadow-2xl xl:shadow-none
          ${isMenuOpen ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'}
        `}>
          <div className="p-6 pb-4 border-b border-[var(--border-color)] shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">{t('examOverview')}</h2>
              <button onClick={() => setIsMenuOpen(false)} className="xl:hidden p-2 bg-[var(--bg-accent)] rounded-full hover:bg-[var(--card-hover)] text-[var(--text-primary)] transition-colors border border-[var(--border-color)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Progress: answered count and a slim bar, readable at a glance. */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1.5">
                <span>{t('answered')}</span>
                <span>{questions.length - unansweredIndexes.length}/{questions.length}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--bg-accent)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#8AB4F8] transition-all duration-300"
                  style={{ width: `${questions.length ? ((questions.length - unansweredIndexes.length) / questions.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
            <div className="grid grid-cols-5 sm:grid-cols-6 xl:grid-cols-5 gap-1.5">
              {questions.map((q, idx) => {
                const isAnswered = !!selectedAnswers[q.id];
                const isCurrent = idx === currentIndex;
                const isFlagged = flaggedQuestions.has(idx);

                return (
                  <button
                    key={q.id}
                    data-overview-idx={idx}
                    onClick={() => {
                      setCurrentIndex(idx);
                      if (window.innerWidth < 1280) setIsMenuOpen(false);
                    }}
                    className={`aspect-square rounded-lg border relative transition-all flex items-center justify-center text-xs font-bold ${
                      isCurrent 
                        ? 'border-[#8AB4F8] border-2 ring-2 ring-[#8AB4F8]/20 bg-[#8AB4F8]/15 text-[#3b82f6] dark:text-[#8AB4F8]' 
                        : isAnswered
                          ? 'bg-[#8AB4F8]/10 border-[#8AB4F8]/40 text-[#3b82f6] dark:text-[#8AB4F8]'
                          : 'bg-[var(--bg-accent)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#8AB4F8]/40 hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="font-bold">{idx + 1}</span>
                    {isFlagged && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[14px] border-l-[14px] border-t-amber-500 border-l-transparent rounded-tr-lg" />
                    )}
                    {isAnswered && !isCurrent && (
                      <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-[#3b82f6] dark:bg-[#8AB4F8]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-[var(--border-color)] space-y-3 shrink-0 bg-[var(--bg-secondary)]">
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">
              <div className="w-3 h-3 bg-[#8AB4F8]/15 border border-[#8AB4F8]/40 rounded-sm relative">
                <div className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-[#3b82f6] dark:bg-[#8AB4F8]" />
              </div>
              <span>{t('answered')}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">
              <div className="w-3 h-3 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-sm" />
              <span>{t('unanswered')}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest relative">
              <div className="w-3 h-3 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-l-[8px] border-t-amber-500 border-l-transparent" />
              </div>
              <span>{t('flagged')}</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExitModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              role="dialog"
              aria-modal="true"
              className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[28px] p-7 md:p-9 max-w-md w-full shadow-2xl text-center"
            >
              <div className="bg-amber-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <LogOut className="w-7 h-7 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('exitExamTitle')}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-7 leading-relaxed">
                {saveProgress ? t('exitExamSavedDesc') : t('exitExamLostDesc')}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="w-full bg-[#8AB4F8] text-gray-900 py-3.5 rounded-2xl font-bold hover:bg-[#AECBFA] transition-all"
                >
                  {t('keepWorking')}
                </button>
                <button
                  onClick={handleExit}
                  className="w-full bg-[var(--bg-accent)] text-[var(--text-primary)] py-3.5 rounded-2xl font-bold hover:bg-[var(--card-hover)] transition-all border border-[var(--border-color)] flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  {t('exitWithoutSubmitting')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Final Submission Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubmitModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[32px] p-8 md:p-12 max-w-md w-full shadow-2xl text-center"
            >
              <div className="bg-amber-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">{t('finishExam')}</h2>
              <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
                {t('submitModalDesc')}
              </p>

              {/* Everything a student needs before the point of no return. */}
              <div className="mb-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-accent)] p-3.5">
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  {t('submitProgress', {
                    answered: Object.keys(selectedAnswers).filter((id) => !!selectedAnswers[id]).length,
                    total: questions.length,
                    flagged: flaggedQuestions.size,
                  })}
                </p>
                {unansweredIndexes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentIndex(unansweredIndexes[0]);
                      setShowSubmitModal(false);
                    }}
                    className="mt-2 text-[11px] font-bold text-[#3b82f6] dark:text-[#8AB4F8] hover:underline"
                  >
                    {t('reviewUnanswered')} ({unansweredIndexes.length})
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSubmit}
                  className="w-full bg-[#8AB4F8] text-gray-900 py-4 rounded-2xl font-bold hover:bg-[#AECBFA] transition-all shadow-lg shadow-[#8AB4F8]/20"
                >
                  {t('submit')}
                </button>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="w-full bg-[var(--bg-accent)] text-[var(--text-primary)] py-4 rounded-2xl font-bold hover:bg-[var(--card-hover)] transition-all border border-[var(--border-color)]"
                >
                  {t('cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
