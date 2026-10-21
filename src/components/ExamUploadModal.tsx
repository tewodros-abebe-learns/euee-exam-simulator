import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Type, X, Sparkles, AlertCircle, Loader2, Info, BookOpen } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { isSupportedUpload, SUPPORTED_UPLOAD_EXTENSIONS } from '../lib/fileParser';

interface ExamUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, subject: string, grade: string) => Promise<void>;
  onProcessText: (text: string, subject: string, grade: string) => Promise<void>;
  isParsing?: boolean;
  defaultSubject?: string;
  defaultGrade?: string;
}

import { SUBJECTS, GRADES, subjectLabelKey, gradeLabelKey } from '../lib/subjects';

export default function ExamUploadModal({
  isOpen,
  onClose,
  onUpload,
  onProcessText,
  isParsing = false,
  defaultSubject = 'General',
  defaultGrade = 'Grade 12',
}: ExamUploadModalProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'upload' | 'paste'>('upload');
  const [subject, setSubject] = useState(defaultSubject);
  const [grade, setGrade] = useState(defaultGrade);
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError('');
      try {
        await onUpload(file, subject, grade);
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Failed to process document');
      }
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError('');
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!isSupportedUpload(file)) {
      setError('Please upload a PDF, an image (PNG/JPG/WebP), or a plain-text/Markdown file.');
      return;
    }

    try {
      await onUpload(file, subject, grade);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to process document');
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) {
      setError('Please paste your exam questions or markdown text.');
      return;
    }
    setError('');
    try {
      await onProcessText(pastedText, subject, grade);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to process text');
    }
  };

  const getSubjectName = (subj: string) => t(subjectLabelKey(subj) as any);
  const getGradeName = (grd: string) => t(gradeLabelKey(grd) as any);

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
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="bg-[#8AB4F8]/10 w-10 h-10 rounded-xl flex items-center justify-center text-[#8AB4F8]">
              {tab === 'upload' ? <Upload className="w-5 h-5" /> : <Type className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                {tab === 'upload' ? t('uploadExamDoc') : t('pasteExamText')}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">{t('createInteractiveSeconds')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Beta Warning */}
        <div className="mb-6 p-4 rounded-xl bg-orange-400/10 border border-orange-400/20 text-orange-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold block mb-1">Beta Testing Feature</strong>
            <p className="leading-relaxed opacity-90">
              This upload tool is a new experimental feature and might have some issues processing complex exams. If it doesn't work perfectly, you can always take the official provided exams on the homepage.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[var(--bg-accent)] p-1 rounded-2xl mb-6 border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => {
              setTab('upload');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              tab === 'upload'
                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText className="w-4 h-4" />
            {t('uploadFileTab')}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('paste');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              tab === 'paste'
                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Type className="w-4 h-4" />
            {t('pasteTextTab')}
          </button>
        </div>

        {/* Subject & Grade Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              {t('subjectLabel')}
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#8AB4F8] transition-colors"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                  {getSubjectName(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              {t('gradeLevelLabel')}
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#8AB4F8] transition-colors"
            >
              {GRADES.map((g) => (
                <option key={g} value={g} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                  {getGradeName(g)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload Mode */}
        {tab === 'upload' ? (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={SUPPORTED_UPLOAD_EXTENSIONS.join(',')}
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
                {isParsing ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8" />
                )}
              </div>
              <h4 className="text-base font-bold text-[var(--text-primary)] mb-1.5">
                {isParsing ? t('processingFile') : t('dragDropText')}
              </h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                {t('supportedFormats')}
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
        ) : (
          /* Paste Mode */
          <div>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste questions here... Format example:&#10;&#10;1. What is the powerhouse of the cell?&#10;A) Nucleus&#10;B) Mitochondria&#10;C) Ribosome&#10;D) Chloroplast&#10;Answer: B&#10;Explanation: Mitochondria generates ATP."
              rows={5}
              className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[#8AB4F8] transition-colors resize-none mb-4 leading-relaxed max-h-[220px]"
            />

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-white/5 text-[var(--text-primary)] rounded-xl font-bold hover:bg-white/10 transition-all text-xs"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={isParsing || !pastedText.trim()}
                className="px-6 py-2.5 bg-[#8AB4F8] text-gray-900 rounded-xl font-bold hover:bg-[#AECBFA] transition-all flex items-center gap-2 text-xs shadow-md disabled:opacity-50"
              >
                {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isParsing ? t('processingText') : t('generateExamBtn')}
              </button>
            </div>
          </div>
        )}

        {error && (
          (() => {
            const isBusy = /busy|high traffic|capacity|rate limit|quota|temporarily|available official/i.test(error);
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
                      {t('browseOfficialExams')}
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
