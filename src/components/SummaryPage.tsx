import { useEffect, useMemo, useState } from 'react';
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
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Question } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import LatexText from './LatexText';
import { gradeExam, getAnswerStatus, getCorrectAnswer } from '../lib/scoring';
import { formatDuration } from '../lib/time';
import { hasRichText } from '../lib/richText';

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
/** How many answered questions the review draws at a time. */
const REVIEW_PAGE_SIZE = 20;

/** One number + label inside the result card. No boxes, no repeated words. */
function Metric({
  icon: Icon,
  value,
  label,
  tone,
  onClick,
  active = false,
  hint,
}: {
  icon: typeof CheckCircle2;
  value: string | number;
  label: string;
  tone: string;
  /** When given, the number is a shortcut to those questions. */
  onClick?: () => void;
  active?: boolean;
  hint?: string;
}) {
  const inner = (
    <>
      <Icon className={`w-4 h-4 shrink-0 ${tone}`} />
      <div className="min-w-0">
        <div className={`text-lg font-black leading-none ${tone}`}>{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-1 truncate">
          {label}
        </div>
      </div>
    </>
  );

  if (!onClick) {
    return <div className="flex items-center gap-2.5 min-w-0 px-4 py-3">{inner}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      aria-pressed={active}
      className={`flex items-center gap-2.5 min-w-0 px-4 py-3 text-left rounded-xl transition-colors ${
        active ? 'bg-[var(--bg-accent)] ring-1 ring-inset ring-[#8AB4F8]/50' : 'hover:bg-[var(--bg-accent)]'
      }`}
    >
      {inner}
    </button>
  );
}

/**
 * The student's answer and the key are answer *options*, not prose blocks.
 *
 * They used to be printed as raw strings, so an option written as
 * `$5\ \text{m/s east}$` appeared with its dollar signs and backslashes
 * intact, while the explanation right underneath rendered the same notation
 * as proper maths. Plain options stay exactly as typed — running "5 m/s east"
 * through Markdown would eat nothing, but "a*b*c" would lose its asterisks —
 * and anything that actually carries maths or emphasis is rendered.
 */
function AnswerText({ text, className = '' }: { text: string; className?: string }) {
  if (!hasRichText(text)) {
    return <span className={`whitespace-pre-wrap ${className}`}>{text}</span>;
  }
  // LatexText renders block-level Markdown, so the rich variant is a block too:
  // a <div> inside a <span> is invalid markup, and the answer row is laid out
  // with flex, where either is welcome.
  return (
    <div className={`min-w-0 break-words ${className}`}>
      <LatexText text={text} />
    </div>
  );
}

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
  const [copyFailed, setCopyFailed] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  // Which slice of the paper the review panel is showing. `all` is the default;
  // clicking Correct / Incorrect / Skipped narrows it to exactly those.
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect' | 'skipped'>('all');
  const [showAiTools, setShowAiTools] = useState(false);
  const [visibleCount, setVisibleCount] = useState(REVIEW_PAGE_SIZE);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  const result = useMemo(() => gradeExam(questions, userAnswers), [questions, userAnswers]);
  const missedCount = result.incorrect + result.skipped;

  // The review list, with each question's status resolved once.
  const reviewRows = useMemo(
    () =>
      questions.map((question, index) => ({
        question,
        index,
        status: getAnswerStatus(question, userAnswers),
      })),
    [questions, userAnswers]
  );
  const visibleRows =
    reviewFilter === 'all'
      ? reviewRows
      : reviewRows.filter((row) => row.status === reviewFilter);

  // Rendering a 60–100 question review means 300+ markdown + KaTeX trees in one
  // commit, which froze the screen for seconds on a phone. The list is drawn a
  // page at a time instead; the filters still apply to everything.
  const shownRows = visibleRows.slice(0, visibleCount);
  const hiddenCount = visibleRows.length - shownRows.length;

  const filterLabel =
    reviewFilter === 'correct'
      ? t('correct')
      : reviewFilter === 'incorrect'
        ? t('incorrect')
        : reviewFilter === 'skipped'
          ? t('skipped')
          : t('allQuestions');

  // A new filter (or reopening the panel) starts from the first page again.
  useEffect(() => {
    setVisibleCount(REVIEW_PAGE_SIZE);
  }, [reviewFilter, showReview]);

  /** Clicking a number opens the review on those questions; clicking again clears. */
  const toggleFilter = (filter: 'correct' | 'incorrect' | 'skipped', count: number) => {
    if (count === 0) return;
    if (reviewFilter === filter) {
      setReviewFilter('all');
      return;
    }
    setReviewFilter(filter);
    setShowReview(true);
  };

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
Score: ${result.correct}/${result.graded} (${result.percentage}%)

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
      setCopyFailed(true);
      window.setTimeout(() => setCopyFailed(false), 3000);
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

  // A paper with no answer keys has no score to colour: 0% there would look
  // like a failed attempt instead of "this cannot be graded".
  const hasScore = result.graded > 0;
  const scoreTone = !hasScore
    ? 'text-[var(--text-secondary)]'
    : result.percentage >= 75
      ? 'text-emerald-500'
      : result.percentage >= 50
        ? 'text-amber-500'
        : 'text-red-500';

  /** One short line that answers "how did I do?" — never repeats the numbers. */
  const verdict = !hasScore
    ? t('ungradedPracticeNote')
    : missedCount === 0
      ? t('allCorrect')
      : t('summaryToReview', { count: missedCount });

  const copyLabel = isCopied ? t('copied') : copyFailed ? t('copyFailed') : t('copyStudyPrompt');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
        {/* ---------------------------------------------------------------- */}
        {/* Header: what was sat, in one line                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-start gap-3 mb-6">
          <span className="w-10 h-10 shrink-0 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] leading-tight">
              {t('examCompleted')}
            </h1>
            <p className="text-sm font-semibold text-[#3b82f6] dark:text-[#8AB4F8] truncate">{title}</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[11px] font-bold text-[var(--text-secondary)] shrink-0">
            {t('questionCountLabel', { count: result.total })}
          </span>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Result card                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-5 sm:p-6">
            {/* Score ring */}
            <div className="relative w-24 h-24 shrink-0 sm:mr-1">
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
                  strokeDasharray={`${hasScore ? (result.percentage / 100) * 326.7 : 0} 326.7`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black leading-none ${scoreTone}`}>
                  {hasScore ? `${result.percentage}%` : '—'}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mt-1">
                  {t('score')}
                </span>
              </div>
            </div>

            {/* Metric strip: four numbers, one word each */}
            <div className="flex-1 w-full">
              <p className="text-sm text-[var(--text-primary)] font-semibold text-center sm:text-left mb-1 px-1">
                {verdict}
              </p>
              {result.ungraded > 0 && hasScore && (
                <p className="mb-1 px-1 text-[11px] font-semibold text-amber-500 flex items-center justify-center sm:justify-start gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                  {t('ungradedNote', { count: result.ungraded })}
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-1 md:gap-y-0 md:divide-x divide-[var(--border-color)] mt-2">
                <Metric
                  icon={CheckCircle2}
                  value={result.correct}
                  label={t('correct')}
                  tone="text-emerald-500"
                  onClick={result.correct > 0 ? () => toggleFilter('correct', result.correct) : undefined}
                  active={reviewFilter === 'correct' && showReview}
                  hint={t('viewCorrectAnswers')}
                />
                <Metric
                  icon={XCircle}
                  value={result.incorrect}
                  label={t('incorrect')}
                  tone="text-red-500"
                  onClick={result.incorrect > 0 ? () => toggleFilter('incorrect', result.incorrect) : undefined}
                  active={reviewFilter === 'incorrect' && showReview}
                  hint={t('viewWrongAnswers')}
                />
                <Metric
                  icon={MinusCircle}
                  value={result.skipped}
                  label={t('skipped')}
                  tone={result.skipped > 0 ? 'text-amber-500' : 'text-[var(--text-secondary)]'}
                  onClick={result.skipped > 0 ? () => toggleFilter('skipped', result.skipped) : undefined}
                  active={reviewFilter === 'skipped' && showReview}
                  hint={t('viewSkippedAnswers')}
                />
                <Metric
                  icon={Clock}
                  value={timeSpentSeconds ? formatDuration(timeSpentSeconds) : '—'}
                  label={t('timeSpent')}
                  tone="text-[var(--text-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Actions: one primary, two secondary, all the same height */}
          <div className="border-t border-[var(--border-color)] p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                if (showReview) setReviewFilter('all');
                setShowReview((prev) => !prev);
              }}
              aria-expanded={showReview}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#8AB4F8] text-gray-900 font-bold py-2.5 px-4 hover:bg-[#AECBFA] transition-all text-sm"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              {t('reviewAnswers')}
              {showReview ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
            </button>
            {onReviewMissed && missedCount > 0 && (
              <button
                type="button"
                onClick={onReviewMissed}
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-accent)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold py-2.5 px-4 hover:bg-[var(--card-hover)] transition-all text-sm"
              >
                <Target className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('reviewMissedShort')}</span>
                <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500">
                  {missedCount}
                </span>
              </button>
            )}
            {onRetake && (
              <button
                type="button"
                onClick={onRetake}
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-accent)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold py-2.5 px-4 hover:bg-[var(--card-hover)] transition-all text-sm"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                {t('retakeExam')}
              </button>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Question-by-question review                                        */}
        {/* ---------------------------------------------------------------- */}
        <AnimatePresence initial={false}>
          {showReview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                {reviewFilter !== 'all' && (
                  <div className="flex items-center justify-between gap-3 mb-2 px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      {t('showingCount', { count: visibleRows.length, total: reviewRows.length })} · {filterLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('all')}
                      className="text-[11px] font-bold text-[#3b82f6] dark:text-[#8AB4F8] hover:underline"
                    >
                      {t('showAll')}
                    </button>
                  </div>
                )}
              <div className="space-y-2.5">
                {shownRows.map(({ question, index }) => {
                  const status = getAnswerStatus(question, userAnswers);
                  const correctAnswer = getCorrectAnswer(question);
                  const userAnswer = userAnswers[question.id];
                  const explanationOpen = Boolean(expandedExplanations[question.id]);
                  const statusStyles =
                    status === 'correct'
                      ? 'border-emerald-500/25'
                      : status === 'incorrect'
                        ? 'border-red-500/25'
                        : 'border-[var(--border-color)]';
                  const StatusIcon =
                    status === 'correct' ? CheckCircle2 : status === 'incorrect' ? XCircle : HelpCircle;
                  const statusTone =
                    status === 'correct'
                      ? 'text-emerald-500'
                      : status === 'incorrect'
                        ? 'text-red-500'
                        : 'text-[var(--text-secondary)]';

                  return (
                    <div
                      key={question.id}
                      className={`rounded-2xl border bg-[var(--bg-secondary)] ${statusStyles} p-3.5`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--bg-accent)] border border-[var(--border-color)] text-[11px] font-black text-[var(--text-secondary)]">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-[var(--text-primary)] whitespace-pre-wrap leading-snug">
                            <LatexText text={question.question} />
                          </div>

                          <div className="mt-2 flex flex-col gap-1 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              <span className="text-[var(--text-secondary)] shrink-0">{t('yourAnswer')}:</span>
                              {userAnswer ? (
                                <AnswerText text={userAnswer} className={`font-semibold ${statusTone}`} />
                              ) : (
                                <span className="text-[var(--text-secondary)] italic">{t('notAnswered')}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              <span className="text-[var(--text-secondary)] shrink-0">{t('correctAnswer')}:</span>
                              {correctAnswer ? (
                                <AnswerText text={correctAnswer} className="font-semibold text-emerald-500" />
                              ) : (
                                <span className="text-[var(--text-secondary)] italic">{t('noAnswerKey')}</span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleExplanation(question.id)}
                            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#3b82f6] dark:text-[#8AB4F8] hover:underline"
                            aria-expanded={explanationOpen}
                          >
                            {explanationOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {explanationOpen ? t('hideExplanation') : t('showExplanation')}
                          </button>
                          {explanationOpen && (
                            <div className="mt-2 rounded-xl bg-[var(--bg-accent)] border border-[var(--border-color)] p-3 text-xs text-[var(--text-primary)] leading-relaxed">
                              <LatexText text={question.explanation || t('noExplanation')} />
                            </div>
                          )}
                        </div>

                        <StatusIcon className={`shrink-0 w-4 h-4 ${statusTone}`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {hiddenCount > 0 && (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((previous) => previous + REVIEW_PAGE_SIZE)}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-accent)]"
                  >
                    {t('showMoreQuestions', { count: Math.min(hiddenCount, REVIEW_PAGE_SIZE) })}
                  </button>
                </div>
              )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------------------------------------------------------- */}
        {/* Answer sheet: compact chips instead of a long vertical list        */}
        {/* ---------------------------------------------------------------- */}
        <section className="mt-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">{t('yourAnswers')}</h2>
            <button
              type="button"
              onClick={copyPrompt}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-accent)] transition-colors"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : copyFailed ? (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              )}
              {copyLabel}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3">
            {questions.map((q, index) => {
              const optionIndex = q.options.indexOf(userAnswers[q.id]);
              const hasAnswer = optionIndex !== -1;
              const isUnanswered = !hasAnswer;
              const letter = isUnanswered ? '—' : LETTERS[optionIndex] || '?';
              const correctAnswer = getCorrectAnswer(q);
              const hasKey = correctAnswer !== undefined;
              const isCorrect = hasAnswer && userAnswers[q.id] === correctAnswer;
              const tone = isUnanswered
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : !hasKey
                  ? 'bg-[var(--bg-accent)] text-[var(--text-secondary)] border-[var(--border-color)]'
                  : isCorrect
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-500 border-red-500/20';
              return (
                <span
                  key={q.id}
                  title={`Q${index + 1}: ${isUnanswered ? t('notAnswered') : letter}`}
                  aria-label={`Q${index + 1}: ${isUnanswered ? t('notAnswered') : letter}`}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${tone}`}
                >
                  <span className="opacity-60 font-semibold">{index + 1}</span>
                  <span>{letter}</span>
                </span>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* AI study tools: available, but folded away by default              */}
        {/* ---------------------------------------------------------------- */}
        <section className="mt-8">
          <button
            type="button"
            onClick={() => setShowAiTools((prev) => !prev)}
            aria-expanded={showAiTools}
            className="w-full flex items-center gap-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 py-3 text-left hover:bg-[var(--bg-accent)] transition-colors"
          >
            <span className="w-8 h-8 shrink-0 rounded-xl bg-[#8AB4F8]/10 text-[#8AB4F8] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[var(--text-primary)]">{t('aiTutorTitle')}</span>
              <span className="block text-[11px] text-[var(--text-secondary)] truncate">{t('aiTutorDesc')}</span>
            </span>
            {showAiTools ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            )}
          </button>

          <AnimatePresence initial={false}>
            {showAiTools && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3">
                  <div className="flex flex-wrap gap-2">
                    {aiPlatforms.map((platform) => {
                      const IconComponent = platform.icon;
                      return (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => handleLaunchAI(platform)}
                          title={platform.description}
                          className="group inline-flex items-center gap-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:border-[#8AB4F8]/60 hover:bg-[var(--bg-accent)] transition-colors"
                        >
                          <IconComponent className={`w-3.5 h-3.5 ${platform.accentText}`} />
                          {platform.name}
                          <ExternalLink className="w-3 h-3 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2.5 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {t('aiTutorHint')}
                  </p>
                  <AnimatePresence>
                    {copiedPlatform && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-2 text-[11px] font-bold text-emerald-500 flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {t('copiedAndOpening', { name: copiedPlatform })}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onReset}
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-transparent border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-accent)] transition-all text-sm font-bold"
          >
            {t('backToDashboard')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
