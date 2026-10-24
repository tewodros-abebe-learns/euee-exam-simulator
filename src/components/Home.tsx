import { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, Type, CheckCircle2, FolderOpen } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import ExamUploadModal from './ExamUploadModal';
import SectionBoundary from './SectionBoundary';
import type { ImportedExam } from '../lib/examSchema';

interface HomeProps {
  onUpload?: (file: File, subject: string, grade: string) => Promise<void>;
  onProcessText?: (text: string, subject: string, grade: string) => Promise<void>;
  onImportExam?: (exam: ImportedExam) => Promise<void>;
  isParsing?: boolean;
  /** Switches to the "My Exams" page, where the library now lives. */
  onOpenLibrary?: () => void;
}

/**
 * Home is the landing screen for a signed-in student or a guest.
 *
 * It holds the value proposition and the two ways to create an exam. The exam
 * library itself (search, folders, results) lives on the "My Exams" page so the
 * home screen stays one clear message instead of a hero plus a second list.
 */
export default function Home({ onUpload, onProcessText, onImportExam, isParsing, onOpenLibrary }: HomeProps) {
  const { t } = useLanguage();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadModalDefaultTab, setUploadModalDefaultTab] = useState<'upload' | 'paste'>('upload');

  const openModal = (tab: 'upload' | 'paste') => {
    setUploadModalDefaultTab(tab);
    setIsUploadModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
      {/* Hero: value proposition + create-your-own-exam panel */}
      <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
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

          {onOpenLibrary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-7 flex justify-center lg:justify-start"
            >
              <button
                type="button"
                onClick={onOpenLibrary}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-sm hover:border-[#8AB4F8]/60 hover:bg-white/5 transition-all"
              >
                <FolderOpen className="w-4 h-4 text-[#8AB4F8]" />
                {t('openMyExams')}
              </button>
            </motion.div>
          )}
        </div>

        {/* Right Side: Build your own exam */}
        <div className="w-full lg:w-[400px] shrink-0">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[32px] p-6 sm:p-7 shadow-xl">
            {/* One message, one action: the panel used to carry the words
                "Upload Exam" as a heading and then "Upload New Exam" as the
                button right below it, which read as two separate features. */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-[#8AB4F8]/10 text-[#8AB4F8] flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] leading-snug">{t('uploadExamDesc')}</p>
            </div>

            <ul className="space-y-2 mb-5 text-[11px] text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span>{t('buildStepUpload')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span>{t('buildStepReview')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span>{t('buildStepPractice')}</span>
              </li>
            </ul>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => openModal('upload')}
                className="w-full bg-[#8AB4F8] text-gray-900 px-5 py-3 rounded-2xl font-bold hover:bg-[#AECBFA] transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Upload className="w-4 h-4" />
                {t('uploadNewExam')}
              </button>
              <button
                type="button"
                onClick={() => openModal('paste')}
                className="w-full bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] px-5 py-3 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Type className="w-4 h-4" />
                {t('pasteQuestions')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* A failure inside the dialog stays inside the dialog. */}
      <SectionBoundary resetKey={isUploadModalOpen}>
        <ExamUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUpload={onUpload ?? (async () => {})}
          onProcessText={onProcessText ?? (async () => {})}
          onImportExam={onImportExam}
          isParsing={isParsing}
          defaultTab={uploadModalDefaultTab}
        />
      </SectionBoundary>
    </div>
  );
}
