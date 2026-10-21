import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Bot,
  Brain,
  Compass,
  Cpu,
  Zap,
  Globe,
  XCircle,
  HelpCircle,
  BookOpen,
  RotateCcw,
  Target,
  Clock,
  MinusCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Question } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import LatexText from './LatexText';
import { gradeExam, getAnswerStatus, getCorrectAnswer } from '../lib/scoring';
import { formatDuration } from '../lib/time';

interface SummaryPageProps {
  userAnswers: Record<string, string>;
  questions: Question[];
  title: string;
  onReset: () => void;
  onRetake?: () => void;
  onReviewMissed?: () => void;
  timeSpentSeconds?: number;
  key?: string;
}

interface AIPlatform {
  id: string;
  name: string;
  description: string;
  badge: string;
  url: string;
  bgGradient: string;
  border: string;
  accentText: string;
  badgeColor: string;
  icon: typeof Sparkles;
}

const LETTERS = 'ABCDEFGHIJ';

export default function SummaryPage({
  userAnswers,
  questions,
  title,
  onReset,
  onRetake,
  onReviewMissed,
  timeSpentSeconds,
}: SummaryPageProps) {
  const { t } = useLanguage();
  const [isCopied, setIsCopied] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  const result = useMemo(() => gradeExam(questions, userAnswers), [questions, userAnswers]);
  const missedCount = result.incorrect + result.skipped;

  const formattedAnswers = useMemo(
    () =>
      questions
        .map((q, index) => {
          const ans = userAnswers[q.id];
          const optionIndex = q.options.indexOf(ans);
          const letter = optionIndex !== -1 ? LETTERS[optionIndex] || '?' : 'UNANSWERED';
          return `Q${index + 1}: ${letter}`;
        })
        .join('\n'),
    [questions, userAnswers]
  );

  const fullStudyPrompt = `[EXAM REVIEW & TUTORING REQUEST]
Exam Title: "${title}" (${questions.length} questions)
Score: ${result.correct}/${result.total} (${result.percentage}%)

MY ANSWER KEY:
${formattedAnswers}

INSTRUCTIONS FOR AI TUTOR:
1. I am uploading/attaching the original exam document (or pasting the exam questions) along with this prompt.
2. Please cross-reference my recorded answer choices above with the questions in the attached exam document.
3. For every question—especially those I left unanswered or made a mistake on—provide detailed step-by-step solutions, key concept breakdowns, and clear explanations for why the correct answer is right and why the other options are distractors.
4. Give me tailored study tips and key formula summaries to master these topics.`;

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(fullStudyPrompt);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleLaunchAI = async (platform: AIPlatform) => {
    try {
      await navigator.clipboard.writeText(fullStudyPrompt);
      setCopiedPlatform(platform.name);
      window.setTimeout(() => setCopiedPlatform(null), 3000);
    } catch (err) {
      console.error('Failed to copy prompt: ', err);
    }
    window.open(platform.url, '_blank', 'noopener,noreferrer');
  };

  const toggleExplanation = (id: string) =>
    setExpandedExplanations((prev) => ({ ...prev, [id]: !prev[id] }));

  const aiPlatforms: AIPlatform[] = [
    {
      id: 'notebooklm',
      name: 'NotebookLM',
      description: 'Gemini AI Notebook & Audio Overview',
      badge: 'Notebook',
      url: 'https://notebooklm.google.com',
      bgGradient: 'from-amber-500/10 via-emerald-500/10 to-teal-500/10 hover:from-amber-500/20 hover:via-emerald-500/20 hover:to-teal-500/20',
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      accentText: 'text-emerald-500 dark:text-emerald-400',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
      icon: BookOpen,
    },
    {
      id: 'gemini',
      name: 'Gemini',
      description: 'Google AI Assistant',
      badge: 'Popular',
      url: 'https://gemini.google.com',
      bgGradient: 'from-blue-500/10 via-indigo-500/10 to-purple-500/10 hover:from-blue-500/20 hover:via-indigo-500/20 hover:to-purple-500/20',
      border: 'border-blue-500/30 hover:border-blue-500/60',
      accentText: 'text-blue-500 dark:text-blue-400',
      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30',
      icon: Sparkles,
    },
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      description: 'OpenAI Study Partner',
      badge: 'Top Choice',
      url: 'https://chatgpt.com',
      bgGradient: 'from-emerald-500/10 via-teal-500/10 to-green-500/10 hover:from-emerald-500/20 hover:via-teal-500/20 hover:to-green-500/20',
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      accentText: 'text-emerald-500 dark:text-emerald-400',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
      icon: Bot,
    },
    {
      id: 'aistudio',
      name: 'AI Studio',
      description: 'Google AI Studio',
      badge: 'Pro Reasoning',
      url: 'https://aistudio.google.com',
      bgGradient: 'from-cyan-500/10 via-sky-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:via-sky-500/20 hover:to-blue-500/20',
      border: 'border-cyan-500/30 hover:border-cyan-500/60',
      accentText: 'text-cyan-500 dark:text-cyan-400',
      badgeColor: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30',
      icon: Brain,
    },
    {
      id: 'claude',
      name: 'Claude',
      description: 'Anthropic AI Tutor',
      badge: 'Deep Review',
      url: 'https://claude.ai',
      bgGradient: 'from-amber-500/10 via-orange-500/10 to-yellow-500/10 hover:from-amber-500/20 hover:via-orange-500/20 hover:to-yellow-500/20',
      border: 'border-amber-500/30 hover:border-amber-500/60',
      accentText: 'text-amber-500 dark:text-amber-400',
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
      icon: Compass,
    },
    {
      id: 'qwen',
      name: 'Qwen',
      description: 'Alibaba STEM & Math',
      badge: 'Math & Sci',
      url: 'https://chat.qwenlm.ai',
      bgGradient: 'from-purple-500/10 via-violet-500/10 to-fuchsia-500/10 hover:from-purple-500/20 hover:via-violet-500/20 hover:to-fuchsia-500/20',
      border: 'border-purple-500/30 hover:border-purple-500/60',
      accentText: 'text-purple-500 dark:text-purple-400',
      badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30',
      icon: Cpu,
    },
    {
      id: 'kimi',
      name: 'Kimi',
      description: 'Moonshot AI Assistant',
      badge: 'Long Context',
      url: 'https://kimi.ai',
      bgGradient: 'from-sky-500/10 via-blue-500/10 to-indigo-500/10 hover:from-sky-500/20 hover:via-blue-500/20 hover:to-indigo-500/20',
      border: 'border-sky-500/30 hover:border-sky-500/60',
      accentText: 'text-sky-500 dark:text-sky-400',
      badgeColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30',
      icon: Zap,
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      description: 'DeepSeek Reasoning AI',
      badge: 'Advanced',
      url: 'https://chat.deepseek.com',
      bgGradient: 'from-indigo-500/10 via-blue-600/10 to-cyan-500/10 hover:from-indigo-500/20 hover:via-blue-600/20 hover:to-cyan-500/20',
      border: 'border-indigo-500/30 hover:border-indigo-500/60',
      accentText: 'text-indigo-500 dark:text-indigo-400',
      badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30',
      icon: Globe,
    },
  ];

  const scoreTone =
    result.percentage >= 75
      ? 'text-emerald-500'
      : result.percentage >= 50
        ? 'text-amber-500'
        : 'text-red-500';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-14">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
        <div className="flex justify-center mb-5">
          <div className="bg-emerald-500/10 p-4 rounded-full border border-emerald-500/20 shadow-xs text-emerald-500">
            <CheckCircle2 className="w-12 h-12" />
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-2 tracking-tight text-center">
          {t('examCompleted')}
        </h1>
        <h2 className="text-lg md:text-xl font-bold text-[#3b82f6] dark:text-[#8AB4F8] mb-8 text-center">{title}</h2>

        {/* Result summary */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-32 h-32 shrink-0">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden="true">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-color)" strokeWidth="12" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    className={scoreTone}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(result.percentage / 100) * 326.7} 326.7`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-black ${scoreTone}`}>{result.percentage}%</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                    {t('score')}
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-secondary)]">
                    {t('resultSummary')}
                  </h3>
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {t('answeredOfTotal', { answered: result.answered, total: result.total })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t('correct')}</p>
                      <p className="text-lg font-black text-emerald-500 leading-none">{result.correct}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t('incorrect')}</p>
                      <p className="text-lg font-black text-red-500 leading-none">{result.incorrect}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-accent)] px-3 py-2">
                    <MinusCircle className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t('skipped')}</p>
                      <p className="text-lg font-black text-[var(--text-primary)] leading-none">{result.skipped}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-accent)] px-3 py-2">
                    <Clock className="w-4 h-4 text-[#3b82f6] dark:text-[#8AB4F8] shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t('timeSpent')}</p>
                      <p className="text-lg font-black text-[var(--text-primary)] leading-none">
                        {timeSpentSeconds ? formatDuration(timeSpentSeconds) : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {missedCount === 0
                    ? t('allCorrect')
                    : t('answeredQuestionsCount', { count: result.answered, total: result.total })}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowReview((prev) => !prev)}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#8AB4F8] text-gray-900 font-bold py-3 hover:bg-[#AECBFA] transition-all text-sm"
                aria-expanded={showReview}
              >
                <BookOpen className="w-4 h-4" />
                {t('reviewAnswers')}
                {showReview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {onReviewMissed && missedCount > 0 && (
                <button
                  onClick={onReviewMissed}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[var(--bg-accent)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold py-3 hover:bg-[var(--card-hover)] transition-all text-sm"
                >
                  <Target className="w-4 h-4" />
                  {t('reviewMissed')} ({missedCount})
                </button>
              )}
              {onRetake && (
                <button
                  onClick={onRetake}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[var(--bg-accent)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold py-3 hover:bg-[var(--card-hover)] transition-all text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('retakeExam')}
                </button>
              )}
            </div>
          </div>

          {/* Question-by-question review */}
          <AnimatePresence initial={false}>
            {showReview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-3">
                  {questions.map((question, index) => {
                    const status = getAnswerStatus(question, userAnswers);
                    const correctAnswer = getCorrectAnswer(question);
                    const userAnswer = userAnswers[question.id];
                    const explanationOpen = Boolean(expandedExplanations[question.id]);
                    const statusStyles =
                      status === 'correct'
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : status === 'incorrect'
                          ? 'border-red-500/30 bg-red-500/5'
                          : 'border-[var(--border-color)] bg-[var(--bg-secondary)]';

                    return (
                      <div key={question.id} className={`rounded-2xl border ${statusStyles} p-4 text-left`}>
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--bg-accent)] border border-[var(--border-color)] text-xs font-black text-[var(--text-primary)]">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm md:text-base font-semibold text-[var(--text-primary)] whitespace-pre-wrap">
                              <LatexText text={question.question} />
                            </div>

                            <div className="mt-3 space-y-1.5 text-xs md:text-sm">
                              <p className="flex items-start gap-2">
                                <span className="font-bold text-[var(--text-secondary)] shrink-0">{t('yourAnswer')}:</span>
                                {userAnswer ? (
                                  <span className={status === 'correct' ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                                    {userAnswer}
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-secondary)] italic">{t('notAnswered')}</span>
                                )}
                              </p>
                              <p className="flex items-start gap-2">
                                <span className="font-bold text-[var(--text-secondary)] shrink-0">{t('correctAnswer')}:</span>
                                <span className="text-emerald-500 font-semibold">{correctAnswer ?? '—'}</span>
                              </p>
                            </div>

                            <button
                              onClick={() => toggleExplanation(question.id)}
                              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#3b82f6] dark:text-[#8AB4F8] hover:underline"
                              aria-expanded={explanationOpen}
                            >
                              {explanationOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              {explanationOpen ? t('hideExplanation') : t('showExplanation')}
                            </button>
                            {explanationOpen && (
                              <div className="mt-2 rounded-xl bg-[var(--bg-accent)] border border-[var(--border-color)] p-3 text-xs md:text-sm text-[var(--text-primary)] leading-relaxed">
                                <LatexText text={question.explanation || t('noExplanation')} />
                              </div>
                            )}
                          </div>

                          <span className="shrink-0">
                            {status === 'correct' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : status === 'incorrect' ? (
                              <XCircle className="w-5 h-5 text-red-500" />
                            ) : (
                              <HelpCircle className="w-5 h-5 text-[var(--text-secondary)]" />
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Answer key */}
        <div className="max-w-2xl mx-auto mb-16 text-left">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-xl font-black text-[var(--text-primary)]">{t('answerKey')}</h3>
            <button
              onClick={copyPrompt}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-full px-5 py-2 text-xs font-bold flex items-center gap-2 hover:bg-[var(--bg-accent)] transition-all cursor-pointer shadow-xs"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  {t('copied')}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
                  {t('copyToClipboard')}
                </>
              )}
            </button>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 overflow-x-auto shadow-xs">
            <div className="font-mono text-sm md:text-base text-[var(--text-primary)] leading-loose">
              {questions.map((q, index) => {
                const optionIndex = q.options.indexOf(userAnswers[q.id]);
                const isUnanswered = optionIndex === -1;
                const letter = isUnanswered ? t('notAnswered') : LETTERS[optionIndex] || '?';
                return (
                  <div key={q.id}>
                    Q{index + 1}: <span className={isUnanswered ? 'text-red-500 font-bold' : ''}>{letter}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI study platforms */}
        <div className="mt-10 pt-10 border-t border-[var(--border-color)]">
          <div className="flex flex-col items-center justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#8AB4F8] border border-[#3b82f6]/20 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Study Assistant</span>
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
              {t('continueStudyTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-lg mx-auto mt-1 font-medium leading-relaxed">
              {t('continueStudyDesc')}
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <button
              onClick={copyPrompt}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-full px-5 py-2.5 text-xs md:text-sm font-bold flex items-center gap-2 shadow-xs hover:bg-[var(--bg-accent)] transition-all cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  {t('copied')}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
                  {t('copyToClipboard')}
                </>
              )}
            </button>
          </div>

          <AnimatePresence>
            {copiedPlatform && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>{t('copiedAndOpening', { name: copiedPlatform })}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 text-left">
            {aiPlatforms.map((platform) => {
              const IconComponent = platform.icon;
              return (
                <button
                  key={platform.id}
                  onClick={() => handleLaunchAI(platform)}
                  className={`group relative flex flex-col justify-between p-4 rounded-2xl bg-gradient-to-br ${platform.bgGradient} border ${platform.border} transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 cursor-pointer overflow-hidden`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xs group-hover:scale-105 transition-transform ${platform.accentText}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${platform.badgeColor}`}>
                        {platform.badge}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[#3b82f6] dark:group-hover:text-[#8AB4F8] transition-colors flex items-center justify-between">
                      <span>{platform.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-secondary)]" />
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5 line-clamp-1">
                      {platform.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-color)]/50 flex items-center justify-between text-xs font-bold">
                    <span className={`${platform.accentText} flex items-center gap-1 group-hover:underline`}>
                      {t('copyAndLaunch')}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-opacity">
                      {t('launchAI')} ↗
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onReset}
          className="mt-12 group inline-flex items-center gap-2 mx-auto px-7 py-3.5 rounded-2xl bg-[#3b82f6] text-white hover:bg-blue-600 transition-all text-sm font-bold shadow-lg cursor-pointer"
        >
          {t('backToDashboard')}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>
    </div>
  );
}
