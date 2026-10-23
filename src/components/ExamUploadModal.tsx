import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Upload,
  FileText,
  Type,
  Sparkles,
  AlertCircle,
  Loader2,
  Info,
  BookOpen,
  FileJson,
  CheckCircle2,
  Download,
  ChevronRight,
  ChevronLeft,
  Lock,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { isLocalImportFile, SUPPORTED_UPLOAD_EXTENSIONS, getFileExtension } from '../lib/fileParser';
import { subjectDisplayName, type TranslationKey } from '../lib/subjects';
import { useSubjects } from '../lib/subjectStore';
import { EXAM_JSON_TEMPLATE, suggestTitleFromFileName, type ImportReport, type ImportedExam } from '../lib/examSchema';
import { parseExamText } from '../lib/examImport';
import { buildAiPrompt, buildSampleFile, type SampleFormat } from '../lib/examSamples';
import { lockScroll, unlockScroll } from '../lib/scrollLock';

interface ExamUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, subject: string, grade?: string) => Promise<void>;
  onProcessText: (text: string, subject: string, grade?: string) => Promise<void>;
  /** Adds an exam that was parsed on-device (JSON or Markdown import). */
  onImportExam?: (exam: ImportedExam) => Promise<void>;
  isParsing?: boolean;
  defaultSubject?: string;
  /** Which tab the modal opens on (e.g. "paste" from the Paste questions button). */
  defaultTab?: Tab;
}

type Tab = 'upload' | 'paste' | 'import';

type ExamFormat = 'auto' | 'json' | 'markdown' | 'pdf' | 'csv' | 'text' | 'image';

interface FormatOption {
  id: ExamFormat;
  labelKey: TranslationKey;
  /** File extensions this format accepts. */
  accept: string[];
  /** `local` parses on the device, `ai` needs the extractor, `auto` decides per file. */
  route: 'local' | 'ai' | 'auto';
}

/**
 * Choosing a format up front keeps the picker, the drop zone and the parser in
 * agreement, so a PDF can never be fed to the JSON reader (or vice versa).
 */
const FORMATS: FormatOption[] = [
  { id: 'auto', labelKey: 'formatAuto', accept: [...SUPPORTED_UPLOAD_EXTENSIONS], route: 'auto' },
  { id: 'json', labelKey: 'formatJson', accept: ['.json'], route: 'local' },
  { id: 'markdown', labelKey: 'formatMarkdown', accept: ['.md', '.markdown'], route: 'local' },
  { id: 'pdf', labelKey: 'formatPdf', accept: ['.pdf'], route: 'ai' },
  // CSV and plain text are read on the device like JSON/Markdown: no key, no
  // quota. The import preview still offers "retry with AI" for messy papers.
  { id: 'csv', labelKey: 'formatCsv', accept: ['.csv'], route: 'local' },
  { id: 'text', labelKey: 'formatText', accept: ['.txt'], route: 'local' },
  { id: 'image', labelKey: 'formatImage', accept: ['.png', '.jpg', '.jpeg', '.webp'], route: 'ai' },
];

const formatById = (id: ExamFormat): FormatOption => FORMATS.find((f) => f.id === id) || FORMATS[0];

/** Local formats the "Import" tab can preview. */
const LOCAL_FORMATS = FORMATS.filter((f) => f.route === 'local');

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
/**
 * Pasted text had no bound at all: a multi-megabyte paste (or a stray binary
 * copied into the box) blocked the main thread inside the parser and could
 * freeze the tab. Two million characters is far more than any real paper.
 */
const MAX_PASTE_CHARS = 2_000_000;
const IMPORT_CONFIRM_TIMEOUT_MS = 15000;

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ExamUploadModal({
  isOpen,
  onClose,
  onUpload,
  onProcessText,
  onImportExam,
  isParsing = false,
  defaultSubject = 'General',
  defaultTab = 'upload',
}: ExamUploadModalProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('upload');
  const [format, setFormat] = useState<ExamFormat>('auto');
  const [subject, setSubject] = useState(defaultSubject);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const { subjects: subjectOptions, addSubject } = useSubjects();
  const [pastedText, setPastedText] = useState('');
  // Optional: what the AI prompt should ask for. Empty means the prompt carries
  // a "<my topic>" placeholder the student can fill in themselves.
  const [promptTopic, setPromptTopic] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  // Local import (no AI) state.
  const [preview, setPreview] = useState<ImportReport | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewSource, setPreviewSource] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  // Tracked separately from `isImporting`: a slow save keeps the button locked
  // even after the "still working" message appears, so one exam cannot be
  // added twice by an impatient second click.
  const importInFlightRef = useRef(false);
  // Set when the save outlives the confirm timeout: the button stays locked and
  // the modal closes by itself the moment the save lands.
  const [importPending, setImportPending] = useState(false);
  const pendingSourceRef = useRef<{ file?: File; text?: string } | null>(null);

  const formatOption = formatById(format);
  const isAiFormat = formatOption.route === 'ai';
  // The Import tab can only preview formats the on-device parser understands.
  const localAccept = (formatOption.route === 'local'
    ? formatOption.accept
    : Array.from(new Set(LOCAL_FORMATS.flatMap((option) => option.accept))));

  useEffect(() => {
    if (!isOpen) return;
    lockScroll();
    return () => unlockScroll();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setPreview(null);
    setIsDragging(false);
    setFormat('auto');
    setTab(defaultTab);
    setPromptTopic('');
  }, [isOpen, defaultTab]);

  // Escape closes the dialog unless a save is in flight.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || importInFlightRef.current) return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  /** Selecting a format also moves the student to the tab that fits it. */
  const applyFormat = (next: ExamFormat) => {
    setFormat(next);
    setError('');
    setPreview(null);
    setPreviewTitle('');
    pendingSourceRef.current = null;
    const nextOption = formatById(next);
    if (nextOption.route === 'local') setTab('import');
    else if (nextOption.route === 'ai') setTab('upload');
  };

  const resetPreview = () => {
    setPreview(null);
    setPreviewTitle('');
    setPreviewSource('');
    pendingSourceRef.current = null;
    setError('');
  };

  /** Falls back to the AI extractor for a file/text that had no structure. */
  const retryWithAi = async () => {
    const source = pendingSourceRef.current;
    if (!source) return;
    setError('');
    try {
      if (source.file) await onUpload(source.file, subject);
      else if (source.text) await onProcessText(source.text, subject);
      onClose();
    } catch (err: any) {
      setError(err?.message || t('processFailed'));
    }
  };

  const handleManualClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleImportClick = () => {
    if (importInputRef.current) {
      importInputRef.current.value = '';
      importInputRef.current.click();
    }
  };

  const importFromText = (text: string, sourceName: string, file?: File) => {
    pendingSourceRef.current = { file, text: file ? undefined : text };
    const report = parseExamText(text, {
      subject,
      title: suggestTitleFromFileName(sourceName),
    });
    setPreview(report);
    setPreviewTitle(report.exam?.title || suggestTitleFromFileName(sourceName));
    setPreviewSource(sourceName);
    setTab('import');
  };

  const readLocalFile = async (file: File) => {
    setError('');
    if (file.size > MAX_IMPORT_BYTES) {
      setError(t('fileTooLarge'));
      return;
    }
    setIsReadingFile(true);
    try {
      const text = await file.text();
      importFromText(text, file.name, file);
    } catch (err: any) {
      setError(err?.message || t('fileUnreadable'));
    } finally {
      setIsReadingFile(false);
    }
  };

  /**
   * Validates the picked file against the chosen format, then routes it to the
   * on-device parser or to the AI extractor. One path for picker and drag-drop,
   * so the two cannot disagree.
   */
  const handleSelectedFile = async (file: File) => {
    setError('');
    const option = formatById(format);
    const extension = getFileExtension(file.name);

    if (!extension) {
      setError(t('formatMismatch', { file: file.name, format: t(option.labelKey) }));
      return;
    }

    if (format !== 'auto' && !option.accept.includes(extension)) {
      setError(t('formatMismatch', { file: extension, format: t(option.labelKey) }));
      return;
    }

    const route = option.route === 'auto' ? (isLocalImportFile(file) ? 'local' : 'ai') : option.route;

    if (route === 'local') {
      await readLocalFile(file);
      return;
    }

    try {
      await onUpload(file, subject);
      onClose();
    } catch (err: any) {
      setError(err?.message || t('processFailed'));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleSelectedFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await handleSelectedFile(file);
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) {
      setError(t('pasteEmpty'));
      return;
    }
    if (pastedText.length > MAX_PASTE_CHARS) {
      setError(t('pasteTooLong'));
      return;
    }
    setError('');
    try {
      await onProcessText(pastedText, subject);
      onClose();
    } catch (err: any) {
      setError(err?.message || t('processFailed'));
    }
  };

  const handlePasteImport = () => {
    if (!pastedText.trim()) {
      setError(t('pasteEmpty'));
      return;
    }
    if (pastedText.length > MAX_PASTE_CHARS) {
      setError(t('pasteTooLong'));
      return;
    }
    setError('');
    importFromText(pastedText, 'Pasted exam');
  };

  const handleConfirmImport = async () => {
    if (!preview?.exam || !onImportExam || importInFlightRef.current) return;
    importInFlightRef.current = true;
    setIsImporting(true);
    setError('');
    const payload = {
      ...preview.exam,
      title: previewTitle.trim() || preview.exam.title,
      subject,
      grade: preview.exam.grade,
    };
    let guard: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const saving = onImportExam(payload);
    try {
      // Safety net: if a future change makes saving block, say so instead of
      // leaving a spinner that never ends.
      await Promise.race([
        saving,
        new Promise<never>((_, reject) => {
          guard = setTimeout(() => {
            timedOut = true;
            reject(new Error(t('importStillWorking')));
          }, IMPORT_CONFIRM_TIMEOUT_MS);
        }),
      ]);
      onClose();
    } catch (err: any) {
      if (timedOut) {
        // The exam is still being written. Keep the button locked and close
        // quietly once the write lands, so there is exactly one copy.
        setImportPending(true);
        setError(err?.message || t('importStillWorking'));
        void saving
          .then(() => onClose())
          .catch(() => {
            // The save failed after the timeout: unlock the button so the
            // student can retry instead of staring at a dead control.
            importInFlightRef.current = false;
            setIsImporting(false);
            setImportPending(false);
            setError(t('importFailed'));
          });
      } else {
        setError(err?.message || t('importFailed'));
      }
    } finally {
      if (guard) clearTimeout(guard);
      if (!timedOut) {
        importInFlightRef.current = false;
        setIsImporting(false);
      }
    }
  };

  const getSubjectName = (subj: string) => subjectDisplayName(subj, t);

  // A folder can be deleted (here or in another tab) while this dialog is open;
  // the picker must never keep a value that no longer exists.
  useEffect(() => {
    if (subjectOptions.length > 0 && !subjectOptions.includes(subject)) {
      setSubject(subjectOptions.includes('General') ? 'General' : subjectOptions[0]);
    }
  }, [subjectOptions, subject]);

  const saveNewSubject = () => {
    const savedName = addSubject(newSubject);
    if (!savedName) {
      setSubjectError(t('subjectNameTooShort'));
      return;
    }
    setSubject(savedName);
    setNewSubject('');
    setSubjectError('');
    setIsAddingSubject(false);
  };

  /** Sample artefact for the current selection (Auto falls back to JSON). */
  const sampleFormat = (format === 'auto' ? 'json' : format) as SampleFormat;

  const downloadSample = () => {
    const sample = buildSampleFile(sampleFormat);
    downloadText(sample.filename, sample.content, sample.mime);
  };

  const downloadAiPrompt = () => {
    // Topic-agnostic by default: the prompt adapts to whatever folder is
    // selected, and only names a topic if the student typed one.
    const prompt = buildAiPrompt(sampleFormat, {
      topic: promptTopic.trim() || undefined,
      subject: subject && subject !== 'All' ? subject : undefined,
      grade: undefined,
    });
    downloadText('exam-import-prompt.txt', prompt, 'text/plain');
  };

  const issues = preview?.issues ?? [];
  const previewQuestions = preview?.exam?.questions ?? [];
  const gradedCount = previewQuestions.filter(
    (q) => q.correctAnswerIndex >= 0 && q.correctAnswerIndex < q.options.length
  ).length;

  /**
   * The dialog has exactly two screens so it never becomes one long form:
   *  1. "Add your exam" — pick a mode, the subject and the source.
   *  2. "Check the questions" — only for the on-device Import route, which can
   *     show a preview before anything is saved.
   */
  const isReviewing = Boolean(preview);
  const canReview = Boolean(onImportExam) && !isAiFormat;
  const modeTabs: { id: Tab; label: string; icon: typeof Upload }[] = [
    { id: 'upload', label: t('uploadFileTab'), icon: FileText },
    { id: 'paste', label: t('pasteTextTab'), icon: Type },
    ...(isAiFormat ? [] : [{ id: 'import' as Tab, label: t('importTab'), icon: FileJson }]),
  ];

  const modeClass = (value: Tab) =>
    `flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
      tab === value
        ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`;

  const chipClass = 'px-2 py-1 rounded-lg font-bold text-[11px]';
  const footerButton =
    'px-5 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const primaryButton = `${footerButton} bg-[#8AB4F8] text-gray-900 hover:bg-[#AECBFA] shadow-md flex items-center justify-center gap-2`;
  const secondaryButton = `${footerButton} bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-white/10 flex items-center justify-center gap-2`;
  const ghostButton = `${footerButton} text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5`;

  // Returning early is only safe here, after every hook has run. Placing this
  // guard above the hooks made a closed dialog render three hooks and an open
  // one four, which React reports as "Rendered more hooks than during the
  // previous render" — the crash that took the whole app down on "Upload" and
  // "Paste questions".
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={isReviewing ? t('reviewStepTitle') : t('uploadExam')}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[26px] sm:rounded-[30px] max-w-xl w-full shadow-2xl z-10 my-auto max-h-[90vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header: title, one line of context, close                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="shrink-0 flex items-start justify-between gap-4 px-5 sm:px-7 pt-5 pb-4 border-b border-[var(--border-color)]">
          <div className="min-w-0">
            <h3 className="text-lg font-display font-bold text-[var(--text-primary)] leading-tight">
              {isReviewing ? t('reviewStepTitle') : t('uploadExam')}
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
              {isReviewing
                ? previewSource || t('reviewStepDesc')
                : t('uploadExamDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 -mt-1 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors shrink-0"
            aria-label={t('cancel')}
          >
            <span aria-hidden className="text-lg leading-none">×</span>
          </button>
        </div>

        {/* Step indicator: quiet, two steps, no extra chrome. */}
        {canReview && (
          <div className="shrink-0 flex items-center gap-2 px-5 sm:px-7 pt-3.5 text-[10px] font-bold uppercase tracking-wider">
            <span
              className={`flex items-center gap-1.5 ${isReviewing ? 'text-[var(--text-secondary)]' : 'text-[#8AB4F8]'}`}
              aria-current={isReviewing ? undefined : 'step'}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                  isReviewing ? 'bg-emerald-400/15 text-emerald-400' : 'bg-[#8AB4F8] text-gray-900'
                }`}
              >
                {isReviewing ? <CheckCircle2 className="w-3 h-3" /> : '1'}
              </span>
              {t('stepAddExam')}
            </span>
            <span className={`flex-1 h-px ${isReviewing ? 'bg-emerald-400/30' : 'bg-[var(--border-color)]'}`} />
            <span
              className={`flex items-center gap-1.5 ${isReviewing ? 'text-[#8AB4F8]' : 'text-[var(--text-secondary)]/70'}`}
              aria-current={isReviewing ? 'step' : undefined}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                  isReviewing ? 'bg-[#8AB4F8] text-gray-900' : 'bg-white/5 text-[var(--text-secondary)]'
                }`}
              >
                2
              </span>
              {t('stepReview')}
            </span>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Body                                                              */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-4">
          {isReviewing ? (
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`text-[11px] font-bold flex items-center gap-1.5 ${
                    preview?.ok ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {preview?.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  {preview?.ok
                    ? t('importReadyCount', {
                        accepted: preview.stats.accepted,
                        total: preview.stats.total,
                      })
                    : t('importNothingReadable')}
                </span>
              </div>

              {preview?.ok && preview.exam && (
                <>
                  <label
                    htmlFor="imported-exam-title"
                    className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5"
                  >
                    {t('examTitleLabel')}
                  </label>
                  <input
                    id="imported-exam-title"
                    type="text"
                    value={previewTitle}
                    onChange={(e) => setPreviewTitle(e.target.value)}
                    className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#8AB4F8] transition-colors mb-3"
                    placeholder={t('examTitleLabel')}
                  />

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`${chipClass} bg-emerald-400/10 text-emerald-400`}>
                      {t('importGradedCount', { graded: gradedCount, total: previewQuestions.length })}
                    </span>
                    {preview.stats.ungraded > 0 && (
                      <span className={`${chipClass} bg-amber-400/10 text-amber-400`}>
                        {t('importUngradedCount', { count: preview.stats.ungraded })}
                      </span>
                    )}
                    {preview.exam.timeLimit ? (
                      <span className={`${chipClass} bg-white/5 text-[var(--text-secondary)]`}>
                        {Math.round(preview.exam.timeLimit / 60)} min
                      </span>
                    ) : null}
                  </div>

                  {/* The key stays sealed until the paper is actually sat. */}
                  <p className="text-[11px] text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 shrink-0" />
                    {t('answerKeySealed')}
                  </p>

                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 rounded-xl">
                    {previewQuestions.map((question, index) => (
                      <div
                        key={question.id}
                        className="bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl p-3"
                      >
                        <p className="text-[11px] text-[var(--text-primary)] font-semibold leading-snug line-clamp-2">
                          {index + 1}. {question.question}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {question.options.map((option, optionIndex) => (
                            <span
                              key={optionIndex}
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-[var(--text-secondary)]"
                            >
                              {String.fromCharCode(65 + optionIndex)}. {option.slice(0, 28)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Notes about the file: collapsed until asked for. */}
              {issues.length > 0 && (
                <details className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/40">
                  <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 shrink-0 text-amber-400" />
                    {t('issuesTitle')} · {issues.length}
                  </summary>
                  <div className="px-3 pb-3 space-y-1 max-h-[130px] overflow-y-auto">
                    {issues.map((issue, index) => (
                      <p
                        key={index}
                        className={`text-[11px] flex items-start gap-1.5 ${
                          issue.level === 'error' ? 'text-red-400' : 'text-amber-400'
                        }`}
                      >
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>
                          {issue.questionNumber ? `Q${issue.questionNumber}: ` : ''}
                          {issue.message}
                        </span>
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div>
              {/* Mode: three short words, no file-type suffixes. */}
              <div
                className="grid gap-1 p-1 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl mb-4"
                style={{ gridTemplateColumns: `repeat(${modeTabs.length}, minmax(0, 1fr))` }}
                role="tablist"
              >
                {modeTabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => {
                      setTab(id);
                      setError('');
                    }}
                    className={modeClass(id)}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Subject: one compact row, hint only while adding one. */}
              <div className="mb-4">
                <label
                  htmlFor="exam-subject"
                  className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5"
                >
                  {t('subjectLabel')}
                </label>

                {!isAddingSubject ? (
                  <div className="flex gap-2">
                    <select
                      id="exam-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="flex-1 min-w-0 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#8AB4F8] transition-colors"
                    >
                      {subjectOptions.map((s) => (
                        <option key={s} value={s} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                          {getSubjectName(s)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSubject(true);
                        setSubjectError('');
                      }}
                      className="px-3.5 rounded-xl bg-[var(--bg-accent)] border border-[var(--border-color)] text-[#8AB4F8] font-bold text-xs hover:bg-white/10 transition-colors whitespace-nowrap"
                    >
                      + {t('addSubject')}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={newSubject}
                        onChange={(e) => {
                          setNewSubject(e.target.value);
                          setSubjectError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveNewSubject();
                          }
                          if (e.key === 'Escape') setIsAddingSubject(false);
                        }}
                        maxLength={40}
                        placeholder={t('newSubjectPlaceholder')}
                        aria-label={t('newSubjectPlaceholder')}
                        className="flex-1 min-w-0 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-gray-600 focus:outline-none focus:border-[#8AB4F8] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={saveNewSubject}
                        className="px-3.5 rounded-xl bg-[#8AB4F8] text-gray-900 font-bold text-xs hover:bg-[#AECBFA] transition-colors whitespace-nowrap"
                      >
                        {t('save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSubject(false);
                          setNewSubject('');
                          setSubjectError('');
                        }}
                        className="px-3 rounded-xl bg-white/5 border border-[var(--border-color)] text-[var(--text-secondary)] font-bold text-xs hover:bg-white/10 transition-colors"
                        aria-label={t('cancel')}
                      >
                        ✕
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">{t('subjectFolderHint')}</p>
                  </>
                )}
                {subjectError && <p className="mt-1.5 text-[11px] text-red-400">{subjectError}</p>}
              </div>

              {/* Upload ---------------------------------------------------- */}
              {tab === 'upload' && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept={formatOption.accept.join(',')}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={handleManualClick}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={handleDrop}
                    aria-busy={isParsing || isReadingFile}
                    className={`w-full border-2 border-dashed rounded-2xl px-5 py-8 flex flex-col items-center justify-center text-center transition-all min-h-[176px] ${
                      isDragging
                        ? 'border-[#8AB4F8] bg-[#8AB4F8]/10'
                        : 'border-[var(--border-color)] hover:border-[#8AB4F8]/60 hover:bg-white/[0.02]'
                    }`}
                  >
                    <span className="w-12 h-12 rounded-2xl bg-[#8AB4F8]/10 text-[#8AB4F8] flex items-center justify-center mb-3">
                      {isParsing || isReadingFile ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)] mb-1">
                      {isParsing
                        ? t('processingFile')
                        : isDragging
                          ? t('dropToUpload')
                          : t('dragDropTextShort')}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] max-w-[19rem] leading-relaxed">
                      {t('formatAccepts', { extensions: formatOption.accept.join(' ') })}
                    </span>
                    <span className="mt-2 text-[10px] font-semibold text-[#8AB4F8]">
                      {formatOption.route === 'local'
                        ? t('jsonSkipsAi')
                        : isAiFormat
                          ? t('formatAiNote')
                          : t('supportedFormats')}
                    </span>
                  </button>
                </div>
              )}

              {/* Paste ----------------------------------------------------- */}
              {tab === 'paste' && (
                <div>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    aria-label={t('pasteTextTab')}
                    placeholder={t('pasteExamPlaceholderExample')}
                    rows={7}
                    className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[#8AB4F8] transition-colors resize-none leading-relaxed"
                  />
                  <p className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {t('pasteImportHint')}
                  </p>
                </div>
              )}

              {/* Import ---------------------------------------------------- */}
              {tab === 'import' && (
                <div>
                  <input
                    type="file"
                    ref={importInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void readLocalFile(file);
                    }}
                    accept={localAccept.join(',')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleImportClick}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) void readLocalFile(file);
                    }}
                    aria-busy={isReadingFile}
                    className={`w-full border-2 border-dashed rounded-2xl px-5 py-8 flex flex-col items-center justify-center text-center transition-all min-h-[176px] ${
                      isDragging
                        ? 'border-emerald-400 bg-emerald-400/10'
                        : 'border-[var(--border-color)] hover:border-emerald-400/60 hover:bg-white/[0.02]'
                    }`}
                  >
                    <span className="w-12 h-12 rounded-2xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center mb-3">
                      {isReadingFile ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <FileJson className="w-6 h-6" />
                      )}
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)] mb-1">
                      {t('importDropTitle')}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] max-w-[19rem] leading-relaxed">
                      {t('importDropHint')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadText('exam-template.json', EXAM_JSON_TEMPLATE, 'application/json')}
                    className="mt-2.5 text-[11px] font-bold text-[#8AB4F8] hover:underline flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t('downloadTemplate')}
                  </button>
                </div>
              )}

              {/* Advanced: format + samples, quiet, below the main action. */}
              <div className="mt-5 pt-4 border-t border-[var(--border-color)] flex flex-wrap items-center gap-x-3 gap-y-2">
                <label
                  htmlFor="exam-format"
                  className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider"
                >
                  {t('formatRowLabel')}
                </label>
                <select
                  id="exam-format"
                  value={format}
                  onChange={(e) => applyFormat(e.target.value as ExamFormat)}
                  className="bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[#8AB4F8] transition-colors max-w-[15rem]"
                >
                  {FORMATS.map((option) => (
                    <option key={option.id} value={option.id} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={promptTopic}
                  onChange={(event) => setPromptTopic(event.target.value)}
                  placeholder={t('promptTopicPlaceholder')}
                  aria-label={t('promptTopicPlaceholder')}
                  maxLength={120}
                  className="bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] placeholder:text-gray-600 focus:outline-none focus:border-[#8AB4F8] transition-colors w-40"
                />
                <div className="ml-auto flex items-center gap-2.5 text-[11px]">
                  <button
                    type="button"
                    onClick={downloadSample}
                    className="text-[var(--text-secondary)] hover:text-[#8AB4F8] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    {t('sampleShort')}
                  </button>
                  <span className="text-[var(--text-secondary)]/40">·</span>
                  <button
                    type="button"
                    onClick={downloadAiPrompt}
                    className="text-[var(--text-secondary)] hover:text-[#8AB4F8] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    {t('promptShort')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            (() => {
              const isBusy = /busy|high traffic|capacity|rate limit|quota|temporarily unavailable/i.test(error);
              if (isBusy) {
                return (
                  <div className="mt-4 p-3.5 rounded-2xl bg-[#1e3a8a]/20 border border-[#8AB4F8]/40 text-blue-200 text-xs flex flex-col gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[#8AB4F8]/20 text-[#8AB4F8] shrink-0 mt-0.5">
                        <Info className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-blue-100 mb-1">{t('aiHighTrafficNotice')}</div>
                        <p className="leading-relaxed text-blue-200/90">{error}</p>
                        <p className="mt-1.5 text-[11px] text-blue-300/80 font-medium">{t('aiBusyTip')}</p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-1.5 bg-[#8AB4F8] text-gray-900 font-bold rounded-xl text-xs hover:bg-[#AECBFA] transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        {t('backToMyExams')}
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              );
            })()
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Footer: exactly the actions that apply to this screen              */}
        {/* ---------------------------------------------------------------- */}
        <div className="shrink-0 px-5 sm:px-7 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          {isReviewing ? (
            <>
              <button type="button" onClick={resetPreview} className={`${ghostButton} w-full sm:w-auto flex items-center justify-center gap-1.5`}>
                <ChevronLeft className="w-3.5 h-3.5" />
                {t('backToAdd')}
              </button>
              <div className="flex flex-col sm:flex-row gap-2">
                {!preview?.ok && pendingSourceRef.current && format !== 'json' && (
                  <button
                    type="button"
                    onClick={retryWithAi}
                    disabled={isParsing}
                    className={`${secondaryButton} w-full sm:w-auto`}
                  >
                    {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {t('tryWithAi')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={!preview?.ok || isImporting || importPending || !onImportExam}
                  className={`${primaryButton} w-full sm:w-auto`}
                  aria-busy={isImporting || importPending}
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {t('addImportedExam', { count: previewQuestions.length })}
                </button>
              </div>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} className={`${ghostButton} w-full sm:w-auto order-2 sm:order-1`}>
                {t('cancel')}
              </button>
              <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
                {tab === 'paste' && (
                  <>
                    {!isAiFormat && (
                      <button
                        type="button"
                        onClick={handlePasteImport}
                        disabled={!pastedText.trim() || isParsing}
                        className={`${secondaryButton} w-full sm:w-auto`}
                      >
                        <ChevronRight className="w-4 h-4" />
                        {t('importWithoutAi')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handlePasteSubmit}
                      disabled={isParsing || !pastedText.trim()}
                      className={`${primaryButton} w-full sm:w-auto`}
                      aria-busy={isParsing}
                    >
                      {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {isParsing ? t('processingText') : t('generateWithAi')}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
