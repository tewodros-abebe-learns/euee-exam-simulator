import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-[var(--border-color)] py-8 px-6 md:px-12 bg-[var(--bg-primary)] transition-colors duration-300">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <span className="text-lg font-bold text-[var(--text-primary)]">EUEE Exam Simulator</span>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            © {new Date().getFullYear()} · {t('worksOffline')}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--text-secondary)]">
          <span>{t('deviceOnly')}</span>
        </div>
      </div>
    </footer>
  );
}
