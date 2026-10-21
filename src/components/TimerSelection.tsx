import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react';
import { Timer, ChevronRight, Save, Check, LogIn, Lock, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { formatDuration } from '../lib/time';

interface TimerSelectionProps {
  /** 0 means "no time limit" (practice mode). */
  onSelect: (seconds: number, saveProgress: boolean) => void;
  currentUser?: any;
  onSignIn?: () => void;
  /** Official duration of the selected paper, offered as a shortcut. */
  recommendedSeconds?: number | null;
  examTitle?: string;
  key?: string;
}

export default function TimerSelection({ onSelect, currentUser, onSignIn, recommendedSeconds, examTitle }: TimerSelectionProps) {
  const { t } = useLanguage();
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [saveProgress, setSaveProgress] = useState<boolean>(!!currentUser);
  const [showGuestSavePopup, setShowGuestSavePopup] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const saveBoxRef = useRef<HTMLDivElement>(null);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setSaveProgress(true);
      setShowGuestSavePopup(false);
    } else {
      setSaveProgress(false);
    }
  }, [currentUser]);

  // Close popup when clicking outside
  useEffect(() => {
    if (!showGuestSavePopup) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (saveBoxRef.current && !saveBoxRef.current.contains(e.target as Node)) {
        setShowGuestSavePopup(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showGuestSavePopup]);

  const presetOptions = [
    { label: t('minutes45'), seconds: 45 * 60 },
    { label: t('hour1'), seconds: 60 * 60 },
    { label: t('hour1half'), seconds: 90 * 60 },
  ];

  // Put the paper's official duration first when it differs from the presets.
  const options = useMemo(() => {
    const recommended = recommendedSeconds && recommendedSeconds > 0
      ? [{ label: `${t('officialExamTime')} · ${formatDuration(recommendedSeconds)}`, seconds: recommendedSeconds }]
      : [];
    const withoutDuplicate = presetOptions.filter(p => p.seconds !== recommendedSeconds);
    return [...recommended, ...withoutDuplicate];
  }, [recommendedSeconds, t]);

  const handleSaveProgressToggle = (enable: boolean) => {
    if (enable && !currentUser) {
      // Guest tried to enable save progress - show the informational bubble
      setShowGuestSavePopup(true);
      setSaveProgress(true); // Allow local storage saving for guest while informing about cloud benefits
    } else {
      setSaveProgress(enable);
      setShowGuestSavePopup(false);
    }
  };

  const handleStartWithTimer = (seconds: number) => {
    onSelect(seconds, saveProgress);
  };

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customMinutes);
    if (isNaN(mins) || mins <= 0) {
      setError(t('enterValidMinutes'));
      return;
    }
    if (mins > 180) {
      setError(t('maxMinutesError'));
      return;
    }
    onSelect(mins * 60, saveProgress);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 md:py-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-[#8AB4F8]/15 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-[#8AB4F8]/30">
          <Timer className="w-8 h-8 text-[#3b82f6] dark:text-[#8AB4F8]" />
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-3 tracking-tight">
          {t('setYourPace')}
        </h2>
        <p className="text-[var(--text-secondary)] mb-2 max-w-md mx-auto leading-relaxed">
          {t('chooseTimeLimitDesc')}
        </p>
        {examTitle && (
          <p className="text-xs font-bold text-[#3b82f6] dark:text-[#8AB4F8] mb-8 max-w-md mx-auto line-clamp-2">
            {examTitle}
          </p>
        )}
        
        {/* Preset Timer Options */}
        <div className="grid gap-3.5 max-w-sm mx-auto mb-8">
          {options.map((opt) => (
            <button
              key={opt.seconds}
              onClick={() => handleStartWithTimer(opt.seconds)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#8AB4F8] text-[var(--text-primary)] font-bold py-4 px-6 rounded-2xl transition-all hover:bg-[var(--card-hover)] group flex items-center justify-between shadow-xs"
            >
              <span className="text-base">{opt.label}</span>
              <ChevronRight className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[#3b82f6] dark:group-hover:text-[#8AB4F8] transition-colors" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleStartWithTimer(0)}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-emerald-400 text-[var(--text-primary)] font-bold py-4 px-6 rounded-2xl transition-all hover:bg-[var(--card-hover)] group flex items-center justify-between shadow-xs"
          >
            <span className="flex items-center gap-2 text-base">
              <Timer className="w-4 h-4 text-emerald-400" />
              {t('practiceUntimed')}
            </span>
            <ChevronRight className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-emerald-400 transition-colors" />
          </button>
        </div>

        {/* Save Progress Card & Guest Warning Pop-up */}
        <div className="max-w-sm mx-auto mb-8 relative" ref={saveBoxRef}>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-5 text-left shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-[#3b82f6] dark:text-[#8AB4F8]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{t('saveProgressTitle')}</h3>
              </div>
              {currentUser ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>{t('cloudActive')}</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>{t('guest')}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
              {currentUser 
                ? "Your answers and session history will be saved to your cloud account so you can review anytime." 
                : t('saveProgressDesc')}
            </p>
            
            <div className="flex gap-2 relative">
              <button 
                type="button"
                onClick={() => handleSaveProgressToggle(true)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border ${
                  saveProgress 
                    ? 'bg-[#8AB4F8] text-gray-900 border-[#8AB4F8] shadow-xs' 
                    : !currentUser
                      ? 'bg-[var(--bg-accent)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-amber-500/50'
                      : 'bg-[var(--bg-accent)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                {saveProgress ? (
                  <Check className="w-3.5 h-3.5" />
                ) : !currentUser ? (
                  <Lock className="w-3 h-3 text-amber-500" />
                ) : null}
                {t('yes')}
              </button>
              <button 
                type="button"
                onClick={() => handleSaveProgressToggle(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border ${
                  !saveProgress 
                    ? 'bg-[#8AB4F8] text-gray-900 border-[#8AB4F8] shadow-xs' 
                    : 'bg-[var(--bg-accent)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                {!saveProgress && <Check className="w-3.5 h-3.5" />}
                {t('no')}
              </button>
            </div>
          </div>

          {/* Guest Sign-In Required Speech Bubble Pop-up (Zoom in/out style) */}
          <AnimatePresence>
            {showGuestSavePopup && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.94 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="absolute top-full left-0 right-0 mt-3 p-4 bg-[var(--bg-secondary)] border border-[#8AB4F8]/40 rounded-2xl shadow-2xl z-50 text-left origin-top"
              >
                {/* Speech Bubble Arrow pointing up to the Yes button */}
                <div className="absolute -top-2 left-1/4 w-3.5 h-3.5 bg-[var(--bg-secondary)] border-t border-l border-[#8AB4F8]/40 transform rotate-45" />

                <div className="relative z-10">
                  {/* Top Bar with Icon & Dismiss */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-500 dark:text-amber-400 shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {t('guestSaveWarningTitle')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGuestSavePopup(false)}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--bg-accent)] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-3.5">
                    {t('guestSaveWarningDesc')}
                  </p>

                  {/* Actions inside speech bubble */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {onSignIn && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowGuestSavePopup(false);
                          onSignIn();
                        }}
                        className="flex-1 bg-[#8AB4F8] hover:bg-[#AECBFA] text-gray-950 font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{t('signInToSave')}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSaveProgress(false);
                        setShowGuestSavePopup(false);
                      }}
                      className="flex-1 bg-[var(--bg-accent)] hover:bg-[var(--card-hover)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold py-2 px-3 rounded-xl text-xs transition-all"
                    >
                      {t('continueWithoutSaving')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Custom Time Form */}
        <div className="max-w-sm mx-auto">
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-color)]"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider font-bold">
              <span className="bg-[var(--bg-primary)] px-3 text-[var(--text-secondary)]">{t('orCustomTime')}</span>
            </div>
          </div>

          <form onSubmit={handleCustomSubmit} className="space-y-3.5">
            <div>
              <input 
                type="number"
                value={customMinutes}
                onChange={(e) => {
                  setCustomMinutes(e.target.value);
                  setError(null);
                }}
                placeholder={t('minutesPlaceholder')}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[#8AB4F8] focus:ring-2 focus:ring-[#8AB4F8]/20 transition-all text-sm font-medium shadow-xs"
              />
              {error && <p className="text-red-500 text-xs mt-2 text-left ml-1 font-medium">{error}</p>}
            </div>
            <button 
              type="submit"
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold py-3.5 rounded-2xl hover:bg-[var(--card-hover)] hover:border-[#8AB4F8]/50 transition-all text-sm shadow-xs"
            >
              {t('startCustomTime')}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
