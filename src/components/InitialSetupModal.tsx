import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Languages, Sun, Moon, Check, User, Sparkles, LogIn, X, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { lockScroll, unlockScroll } from '../lib/scrollLock';
import GoogleIcon from './GoogleIcon';
import { Language } from '../i18n/translations';

interface InitialSetupModalProps {
  isOpen: boolean;
  isDarkMode: boolean;
  onSetTheme: (isDark: boolean) => void;
  onContinueAsGuest: () => void;
  onSignIn: () => void;
  onClose?: () => void;
}

const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'am', label: 'Amharic', native: 'አማርኛ' },
];

export default function InitialSetupModal({
  isOpen,
  isDarkMode,
  onSetTheme,
  onContinueAsGuest,
  onSignIn,
  onClose,
}: InitialSetupModalProps) {
  const { language, setLanguage, t } = useLanguage();
  const { loginWithGoogle, isLoading } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const handleGoogle = async () => {
    if (isGoogleLoading || isLoading) return;
    setGoogleError('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      // The auth listener closes this modal and opens the dashboard.
    } catch (err: any) {
      setGoogleError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  // Prevent background scrolling when modal is open. The overflow lock is
  // shared with the other dialogs so one closing cannot unlock the page while
  // another is still covering it.
  useEffect(() => {
    if (!isOpen) return;
    const originalTouchAction = document.body.style.touchAction;
    lockScroll();
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.touchAction = originalTouchAction;
      unlockScroll();
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain touch-manipulation">
      {/* Backdrop with Blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose || onContinueAsGuest}
        className="fixed inset-0 bg-black/70 backdrop-blur-md pointer-events-auto -z-10 cursor-pointer"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-lg max-h-[min(92vh,750px)] overflow-y-auto overscroll-contain bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl z-10 my-auto text-left"
      >
        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-accent)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header Badge & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8AB4F8]/15 border border-[#8AB4F8]/30 text-[#3b82f6] dark:text-[#8AB4F8] text-xs font-bold mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('welcomeSetup')}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight mb-2">
            EUEE Exam Simulator
          </h2>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
            {t('welcomeSubtitle')}
          </p>
        </div>

        {/* Live Settings Sections */}
        <div className="space-y-5 mb-7">
          {/* 1. Language Selection (Real-Time) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-[#3b82f6] dark:text-[#8AB4F8]" />
                <span>{t('language')}</span>
              </label>
              <span className="text-[10px] text-[#3b82f6] dark:text-[#8AB4F8] font-bold">
                {t('realTimePreview')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {LANGUAGES.map((item) => {
                const isSelected = language === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setLanguage(item.code)}
                    className={`p-3 rounded-2xl border text-left transition-all relative group flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#8AB4F8]/15 border-[#8AB4F8] shadow-xs'
                        : 'bg-[var(--bg-accent)] border-[var(--border-color)] hover:border-[var(--text-secondary)]/40 hover:bg-[var(--card-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`text-sm font-bold truncate ${
                        isSelected ? 'text-[#3b82f6] dark:text-[#8AB4F8]' : 'text-[var(--text-primary)]'
                      }`}>
                        {item.native}
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#8AB4F8] text-gray-950 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Theme Selection (Real-Time) */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 mb-2.5">
              <Sun className="w-3.5 h-3.5 text-[#3b82f6] dark:text-[#8AB4F8]" />
              <span>{t('theme')}</span>
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Light Mode Button */}
              <button
                type="button"
                onClick={() => onSetTheme(false)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  !isDarkMode
                    ? 'bg-[#8AB4F8]/15 border-[#8AB4F8] shadow-xs'
                    : 'bg-[var(--bg-accent)] border-[var(--border-color)] hover:border-[var(--text-secondary)]/40 hover:bg-[var(--card-hover)]'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  !isDarkMode 
                    ? 'bg-amber-400/20 text-amber-500 border-amber-400/30' 
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'
                }`}>
                  <Sun className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${!isDarkMode ? 'text-[#3b82f6] dark:text-[#8AB4F8]' : 'text-[var(--text-primary)]'}`}>
                      {t('light')}
                    </span>
                    {!isDarkMode && (
                      <div className="w-4 h-4 rounded-full bg-[#8AB4F8] text-gray-950 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] block truncate">{t('themeLightDesc')}</span>
                </div>
              </button>

              {/* Dark Mode Button */}
              <button
                type="button"
                onClick={() => onSetTheme(true)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  isDarkMode
                    ? 'bg-[#8AB4F8]/15 border-[#8AB4F8] shadow-xs'
                    : 'bg-[var(--bg-accent)] border-[var(--border-color)] hover:border-[var(--text-secondary)]/40 hover:bg-[var(--card-hover)]'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  isDarkMode 
                    ? 'bg-indigo-500/20 text-[#8AB4F8] border-[#8AB4F8]/30' 
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'
                }`}>
                  <Moon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-[#8AB4F8]' : 'text-[var(--text-primary)]'}`}>
                      {t('dark')}
                    </span>
                    {isDarkMode && (
                      <div className="w-4 h-4 rounded-full bg-[#8AB4F8] text-gray-950 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] block truncate">{t('themeDarkDesc')}</span>
                </div>
              </button>
            </div>
          </div>
        </div>


        {/* 3. Action Buttons: Google, Guest, or Email */}
        <div className="space-y-2.5 pt-2 border-t border-[var(--border-color)]">
          {googleError && (
            <p className="text-[11px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-2.5 text-center leading-relaxed">
              {googleError}
            </p>
          )}

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading || isGoogleLoading}
            aria-busy={isGoogleLoading}
            className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            ) : (
              <GoogleIcon className="w-4 h-4" />
            )}
            <span>{t('googleSignIn')}</span>
          </button>

          {/* Continue as Guest Button */}
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="w-full bg-[#8AB4F8] hover:bg-[#AECBFA] text-gray-950 font-bold py-3 px-5 rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <User className="w-4 h-4 stroke-[2.5]" />
            <span>{t('continueAsGuest')}</span>
          </button>

          {/* Email Sign In / Register Option */}
          <button
            type="button"
            onClick={onSignIn}
            className="w-full bg-[var(--bg-accent)] hover:bg-[var(--card-hover)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-xs cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-[#3b82f6] dark:text-[#8AB4F8]" />
            <span>{t('signInOrRegister')}</span>
          </button>

        </div>
      </motion.div>
    </div>
  );
}
