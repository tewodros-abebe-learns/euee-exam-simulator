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
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { isLocalImportFile, SUPPORTED_UPLOAD_EXTENSIONS, getFileExtension } from '../lib/fileParser';
import { subjectDisplayName, type TranslationKey } from '../lib/subjects';
import { useSubjects } from '../lib/subjectStore';
import { EXAM_JSON_TEMPLATE, suggestTitleFromFileName, type ImportReport, type ImportedExam } from '../lib/examSchema';
import { parseExamText } from '../lib/examImport';
import { buildAiPrompt, buildSampleFile, type SampleFormat } from '../lib/examSamples';

interface ExamUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, subject: string, grade?: string) => Promise<void>;
  onProcessText: (text: string, subject: string, grade?: string) => Promise<void>;
  /** Adds an exam that was parsed on-device (JSON or Markdown import). */
  onImportExam?: (exam: ImportedExam) => Promise<void>;
  isParsing?: boolean;
  defaultSubject?: string;
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
  { id: 'csv', labelKey: 'formatCsv', accept: ['.csv'], route: 'ai' },
  { id: 'text', labelKey: 'formatText', accept: ['.txt'], route: 'ai' },
  { id: 'image', labelKey: 'formatImage', accept: ['.png', '.jpg', '.jpeg', '.webp'], route: 'ai' },
];

const formatById = (id: ExamFormat): FormatOption => FORMATS.find((f) => f.id === id) || FORMATS[0];

/** Local formats the "Import" tab can preview. */
const LOCAL_FORMATS = FORMATS.filter((f) => f.route === 'local');

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
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
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  // Local import (no AI) state.
  const [preview, setPreview] = useState<ImportReport | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewSource, setPreviewSource] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  // The key is hidden by default: the preview must never spoil answers.
  const [showKeys, setShowKeys] = useState(false);
  const pendingSourceRef = useRef<{ file?: File; text?: string } | null>(null);

  const formatOption = formatById(format);
  const isAiFormat = formatOption.route === 'ai';
  // The Import tab can only preview formats the on-device parser understands.
  const localAccept = (formatOption.route === 'local'
    ? formatOption.accept
    : Array.from(new Set(LOCAL_FORMATS.flatMap((option) => option.accept))));

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setPreview(null);
    setIsDragging(false);
    setFormat('auto');
    setTab('upload');
  }, [isOpen]);

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

  if (!isOpen) return null;

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
      setError(err?.message || 'Failed to process the document with AI.');
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
    setShowKeys(false);
    setTab('import');
  };

  const readLocalFile = async (file: File) => {
    setError('');
    if (file.size > MAX_IMPORT_BYTES) {
      setError('That file is larger than 5MB — exam files are usually a few hundred KB.');
      return;
    }
    setIsReadingFile(true);
    try {
      const text = await file.text();
      importFromText(text, file.name, file);
    } catch (err: any) {
      setError(err?.message || 'Could not read that file.');
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
      setError(err?.message || 'Failed to process document');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleSelectedFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await handleSelectedFile(file);
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) {
      setError('Please paste your exam questions or markdown text.');
      return;
    }
    setError('');
    try {
      await onProcessText(pastedText, subject);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to process text');
    }
  };

  const handlePasteImport = () => {
    if (!pastedText.trim()) {
      setError('Please paste your exam questions or markdown text.');
      return;
    }
    setError('');
    importFromText(pastedText, 'Pasted exam');
  };

  const handleConfirmImport = async () => {
    if (!preview?.exam || !onImportExam) return;
    setIsImporting(true);
    setError('');
    let guard: ReturnType<typeof setTimeout> | undefined;
    try {
      // Safety net: if a future change makes saving block, release the button
      // instead of leaving a spinner that never ends.
      await Promise.race([
        onImportExam({
          ...preview.exam,
          title: previewTitle.trim() || preview.exam.title,
          subject,
          grade: preview.exam.grade,
        }),
        new Promise<never>((_, reject) => {
          guard = setTimeout(
            () => reject(new Error(t('importStillWorking'))),
            IMPORT_CONFIRM_TIMEOUT_MS
          );
        }),
      ]);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not add the exam.');
    } finally {
      if (guard) clearTimeout(guard);
      setIsImporting(false);
    }
  };

  const getSubjectName = (subj: string) => subjectDisplayName(subj, t);

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
    downloadText('exam-import-prompt.txt', buildAiPrompt(sampleFormat), 'text/plain');
  };

  const tabClass = (value: Tab) =>
    `flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
      tab === value
        ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`;

  const issues = preview?.issues ?? [];
  const previewQuestions = preview?.exam?.questions ?? [];
  const gradedCount = previewQuestions.filter(
    (q) => q.correctAnswerIndex >= 0 && q.correctAnswerIndex < q.options.length
  ).length;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5 sm:p-7 rounded-[28px] sm:rounded-[32px] max-w-xl w-full shadow-2xl z-10 my-auto max-h-[88vh] flex flex-col overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-[var(--text-primary)] mb-1">
              {t('uploadExam')}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">{t('uploadExamDesc')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 -mt-1 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
            aria-label={t('cancel')}
          >
            <span aria-hidden className="text-lg leading-none">×</span>
          </button>
        </div>

        {/* Exam format: drives the file picker, the drop zone and the parser */}
        <div className="mb-4">
          <label
            htmlFor="exam-format"
            className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2"
          >
            {t('examFormatLabel')}
          </label>
          <select
            id="exam-format"
            value={format}
            onChange={(e) => applyFormat(e.target.value as ExamFormat)}
            className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#8AB4F8] transition-colors"
          >
            {FORMATS.map((option) => (
              <option key={option.id} value={option.id} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                {t(option.labelKey)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {t('formatAccepts', { extensions: formatOption.accept.join(' ') })}
            {' · '}
            {isAiFormat ? t('formatAiNote') : formatOption.route === 'local' ? t('formatLocalNote') : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadSample}
              className="text-[11px] font-bold text-[#8AB4F8] hover:underline flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {t('downloadSample')}
            </button>
            <span className="text-[11px] text-[var(--text-secondary)]">·</span>
            <button
              type="button"
              onClick={downloadAiPrompt}
              className="text-[11px] font-bold text-[#8AB4F8] hover:underline flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t('downloadAiPrompt')}
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[var(--bg-accent)] p-1 rounded-2xl mb-5 border border-[var(--border-color)] gap-1">
          <button type="button" onClick={() => { setTab('upload'); setError(''); }} className={tabClass('upload')}>
            <FileText className="w-4 h-4" />
            {t('uploadFileTab')}
          </button>
          <button type="button" onClick={() => { setTab('paste'); setError(''); }} className={tabClass('paste')}>
            <Type className="w-4 h-4" />
            {t('pasteTextTab')}
          </button>
          {!isAiFormat && (
            <button type="button" onClick={() => { setTab('import'); setError(''); }} className={tabClass('import')}>
              <FileJson className="w-4 h-4" />
              {t('importTab')}
            </button>
          )}
        </div>

        {/* Subject: built-in folders plus the student's own */}
        <div className="mb-5">
          <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            {t('subjectLabel')}
          </label>

          {!isAddingSubject ? (
            <div className="flex gap-2">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#8AB4F8] transition-colors"
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
                className="flex-1 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-gray-600 focus:outline-none focus:border-[#8AB4F8] transition-colors"
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
          )}
          {subjectError && <p className="mt-1.5 text-[11px] text-red-400">{subjectError}</p>}
          <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">{t('subjectFolderHint')}</p>
        </div>

        {/* Upload Mode */}
        {tab === 'upload' && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={formatOption.accept.join(',')}
              className="hidden"
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              onClick={handleManualClick}
              className={`border-2 border-dashed rounded-2xl p-5 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[150px] sm:min-h-[180px] ${
                isDragging
                  ? 'border-[#8AB4F8] bg-[#8AB4F8]/10 scale-[1.01]'
                  : 'border-[var(--border-color)] hover:border-[#8AB4F8]/60 hover:bg-white/2'
              }`}
            >
              <div className="bg-[#8AB4F8]/10 p-4 rounded-2xl mb-4 text-[#8AB4F8]">
                {isParsing || isReadingFile ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
              </div>
              <h4 className="text-base font-bold text-[var(--text-primary)] mb-1.5">
                {isParsing ? t('processingFile') : t('dragDropText')}
              </h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                {t('formatAccepts', { extensions: formatOption.accept.join(' ') })}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]/80 mt-2">
                {formatOption.route === 'local' ? t('jsonSkipsAi') : isAiFormat ? t('formatAiNote') : t('supportedFormats')}
              </p>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-white/5 text-[var(--text-primary)] rounded-xl font-bold hover:bg-white/10 transition-all text-xs"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleManualClick}
                disabled={isParsing}
                className="px-6 py-2.5 bg-[#8AB4F8] text-gray-900 rounded-xl font-bold hover:bg-[#AECBFA] transition-all flex items-center gap-2 text-xs shadow-md disabled:opacity-50"
              >
                {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isParsing ? t('loading') : t('selectOrDropFile')}
              </button>
            </div>
          </div>
        )}

        {/* Paste Mode */}
        {tab === 'paste' && (
          <div>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={
                'Paste questions here... Example:\n\n1. What is the powerhouse of the cell?\nA) Nucleus\nB) Mitochondria\nC) Ribosome\nD) Chloroplast\n\n## Answer Key\n1. B'
              }
              rows={6}
              className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[#8AB4F8] transition-colors resize-none mb-3 leading-relaxed max-h-[220px]"
            />
            <p className="text-[11px] text-[var(--text-secondary)] mb-4 leading-relaxed">
              {t('pasteImportHint')}
            </p>

            <div className="flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-white/5 text-[var(--text-primary)] rounded-xl font-bold hover:bg-white/10 transition-all text-xs"
              >
                {t('cancel')}
              </button>
              {!isAiFormat && (
                <button
                  type="button"
                  onClick={handlePasteImport}
                  disabled={!pastedText.trim()}
                  className="px-5 py-2.5 bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2 text-xs disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                  {t('importWithoutAi')}
                </button>
              )}
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={isParsing || !pastedText.trim()}
                className="px-6 py-2.5 bg-[#8AB4F8] text-gray-900 rounded-xl font-bold hover:bg-[#AECBFA] transition-all flex items-center gap-2 text-xs shadow-md disabled:opacity-50"
              >
                {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isParsing ? t('processingText') : t('generateWithAi')}
              </button>
            </div>
          </div>
        )}

        {/* Import Mode */}
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

            {!preview ? (
              <>
                <div
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
                  onClick={handleImportClick}
                  className={`border-2 border-dashed rounded-2xl p-5 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[160px] ${
                    isDragging
                      ? 'border-[#8AB4F8] bg-[#8AB4F8]/10 scale-[1.01]'
                      : 'border-[var(--border-color)] hover:border-[#8AB4F8]/60 hover:bg-white/2'
                  }`}
                >
                  <div className="bg-emerald-400/10 p-4 rounded-2xl mb-4 text-emerald-400">
                    {isReadingFile ? <Loader2 className="w-8 h-8 animate-spin" /> : <FileJson className="w-8 h-8" />}
                  </div>
                  <h4 className="text-base font-bold text-[var(--text-primary)] mb-1.5">{t('importDropTitle')}</h4>
                  <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed">{t('importDropHint')}</p>
                </div>

                <div className="flex items-center justify-between gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => downloadText('exam-template.json', EXAM_JSON_TEMPLATE, 'application/json')}
                    className="text-[11px] font-bold text-[#8AB4F8] hover:underline flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t('downloadTemplate')}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-white/5 text-[var(--text-primary)] rounded-xl font-bold hover:bg-white/10 transition-all text-xs"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className={`w-4 h-4 ${preview.ok ? 'text-emerald-400' : 'text-red-400'}`} />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {preview.ok
                      ? t('importReadyCount', { accepted: preview.stats.accepted, total: preview.stats.total })
                      : t('importNothingReadable')}
                  </span>
                </div>

                {previewSource && (
                  <p className="text-[11px] text-[var(--text-secondary)] mb-3 truncate">
                    {preview.format === 'json' ? 'JSON' : 'Markdown'} · {previewSource}
                  </p>
                )}

                {preview.ok && preview.exam && (
                  <>
                    <input
                      type="text"
                      value={previewTitle}
                      onChange={(e) => setPreviewTitle(e.target.value)}
                      className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#8AB4F8] transition-colors mb-3"
                      placeholder={t('examTitleLabel')}
                    />

                    <div className="flex flex-wrap gap-2 mb-3 text-[11px]">
                      <span className="px-2 py-1 rounded-lg bg-emerald-400/10 text-emerald-400 font-bold">
                        {t('importGradedCount', { graded: gradedCount, total: previewQuestions.length })}
                      </span>
                      {preview.stats.ungraded > 0 && (
                        <span className="px-2 py-1 rounded-lg bg-amber-400/10 text-amber-400 font-bold">
                          {t('importUngradedCount', { count: preview.stats.ungraded })}
                        </span>
                      )}
                      {preview.exam.timeLimit ? (
                        <span className="px-2 py-1 rounded-lg bg-white/5 text-[var(--text-secondary)] font-bold">
                          {Math.round(preview.exam.timeLimit / 60)} min
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setShowKeys((value) => !value)}
                        aria-pressed={showKeys}
                        className="px-2 py-1 rounded-lg bg-white/5 text-[#8AB4F8] font-bold hover:bg-white/10 transition-colors inline-flex items-center gap-1"
                      >
                        {showKeys ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showKeys ? t('hideAnswerKey') : t('showAnswerKey')}
                      </button>
                    </div>
                    {!showKeys && (
                      <p className="text-[11px] text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                        <Lock className="w-3 h-3 shrink-0" />
                        {t('answerKeyHidden')}
                      </p>
                    )}

                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 mb-3">
                      {previewQuestions.slice(0, 4).map((question, index) => (
                        <div
                          key={question.id}
                          className="bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl p-3"
                        >
                          <p className="text-[11px] text-[var(--text-primary)] font-semibold leading-snug line-clamp-2">
                            {index + 1}. {question.question}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {question.options.map((option, optionIndex) => {
                              const isKey = showKeys && optionIndex === question.correctAnswerIndex;
                              return (
                                <span
                                  key={optionIndex}
                                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                    isKey
                                      ? 'bg-emerald-400/15 text-emerald-400 font-bold'
                                      : 'bg-white/5 text-[var(--text-secondary)]'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optionIndex)}. {option.slice(0, 28)}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {previewQuestions.length > 4 && (
                        <p className="text-[11px] text-[var(--text-secondary)] px-1">
                          +{previewQuestions.length - 4} more
                        </p>
                      )}
                    </div>
                  </>
                )}

                {issues.length > 0 && (
                  <div className="mb-3 max-h-[130px] overflow-y-auto pr-1 space-y-1">
                    {issues.slice(0, 8).map((issue, index) => (
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
                    {issues.length > 8 && (
                      <p className="text-[11px] text-[var(--text-secondary)] pl-4">
                        +{issues.length - 8} more
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 justify-end mt-2">
                  <button
                    type="button"
                    onClick={resetPreview}
                    className="px-5 py-2.5 bg-white/5 text-[var(--text-primary)] rounded-xl font-bold hover:bg-white/10 transition-all text-xs"
                  >
                    {t('chooseAnotherFile')}
                  </button>
                  {!preview.ok && pendingSourceRef.current && format !== 'json' && (
                    <button
                      type="button"
                      onClick={retryWithAi}
                      disabled={isParsing}
                      className="px-5 py-2.5 bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2 text-xs disabled:opacity-50"
                    >
                      {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {t('tryWithAi')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={!preview.ok || isImporting || !onImportExam}
                    className="px-6 py-2.5 bg-[#8AB4F8] text-gray-900 rounded-xl font-bold hover:bg-[#AECBFA] transition-all flex items-center gap-2 text-xs shadow-md disabled:opacity-50"
                  >
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {t('addImportedExam', { count: previewQuestions.length })}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          (() => {
            const isBusy = /busy|high traffic|capacity|rate limit|quota|temporarily unavailable/i.test(error);
            if (isBusy) {
              return (
                <div className="mt-4 p-4 rounded-2xl bg-[#1e3a8a]/20 border border-[#8AB4F8]/40 text-blue-200 text-xs flex flex-col gap-2.5">
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
              <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            );
          })()
        )}
      </motion.div>
    </div>
  );
}
