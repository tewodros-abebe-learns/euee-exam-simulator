import { useEffect, useRef, useState } from 'react';
import { Download, FileJson, FileText } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { examToJsonString, examToMarkdown, type ExportableExam } from '../lib/examSchema';

interface ExportExamButtonProps {
  exam: ExportableExam;
  /** Compact icon-only variant used in exam card toolbars. */
  compact?: boolean;
}

function safeFileName(title: string, extension: string): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9\u1200-\u137f]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'exam';
  return `${base}.${extension}`;
}

function download(filename: string, content: string, mime: string) {
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

/**
 * Exports an exam in the app's portable formats so a student's library is
 * never trapped in one browser (and can be handed to another AI if they want).
 */
export default function ExportExamButton({ exam, compact = true }: ExportExamButtonProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const exportJson = () => {
    download(safeFileName(exam.title, 'json'), examToJsonString(exam), 'application/json');
    setIsOpen(false);
  };

  const exportMarkdown = () => {
    download(safeFileName(exam.title, 'md'), examToMarkdown(exam), 'text/markdown');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={
          compact
            ? 'p-2 text-[var(--text-secondary)] hover:text-[#8AB4F8] transition-colors'
            : 'px-4 py-2 rounded-xl bg-white/5 border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] hover:bg-white/10 transition-colors flex items-center gap-2'
        }
        title={t('exportExam')}
        aria-label={t('exportExam')}
        aria-expanded={isOpen}
      >
        <Download className={compact ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        {!compact && t('exportExam')}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={exportJson}
            className="w-full px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-primary)] hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <FileJson className="w-3.5 h-3.5 text-emerald-400" />
            {t('exportJson')}
          </button>
          <button
            type="button"
            onClick={exportMarkdown}
            className="w-full px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-primary)] hover:bg-white/5 transition-colors flex items-center gap-2 border-t border-[var(--border-color)]"
          >
            <FileText className="w-3.5 h-3.5 text-[#8AB4F8]" />
            {t('exportMarkdown')}
          </button>
        </div>
      )}
    </div>
  );
}
