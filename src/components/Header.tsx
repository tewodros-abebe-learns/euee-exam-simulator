import { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  LogOut,
  Sun,
  Moon,
  Languages,
  ChevronDown,
  Check,
  LogIn,
  Download,
  WifiOff,
  HardDrive,
  Maximize,
  Minimize,
  Smartphone,
  Mail,
  Loader2,
  Home,
  FolderOpen,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import GoogleIcon from './GoogleIcon';
import { useOffline } from '../contexts/OfflineContext';
import { auth } from '../firebase';
import { Language } from '../i18n/translations';

interface HeaderProps {
  currentUser: any;
  onLogout: () => void;
  onDashboard: () => void;
  activeTab: 'HOME' | 'MY_EXAM';
  onTabChange: (tab: 'HOME' | 'MY_EXAM') => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onSignIn?: () => void;
  /** Google sign-in from the account panel; falls back to onSignIn if absent. */
  onGoogleSignIn?: () => Promise<void>;
  /** Guests can own exams too, so the tabs are not tied to a signed-in user. */
  showNav?: boolean;
}

const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'am', label: 'Amharic', native: 'አማርኛ' },
];

/** True when the app is already running as an installed PWA. */
function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export default function Header({
  currentUser,
  onLogout,
  onDashboard,
  activeTab,
  onTabChange,
  isDarkMode,
  toggleTheme,
  onSignIn,
  onGoogleSignIn,
  showNav,
}: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const { isOnline, isInstallable, promptInstall, cachedExamsCount } = useOffline();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(isStandaloneApp);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
    };
  }, []);

  useEffect(() => {
    const onInstalled = () => setIsInstalled(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  // Safari on iPhone/iPad has no Fullscreen API for arbitrary pages.
  const canUseFullScreen =
    typeof document !== 'undefined' &&
    (!!document.documentElement.requestFullscreen ||
      typeof (document.documentElement as any).webkitRequestFullscreen === 'function');

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (typeof (document.documentElement as any).webkitRequestFullscreen === 'function') {
        (document.documentElement as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (typeof (document as any).webkitExitFullscreen === 'function') {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (!onGoogleSignIn) {
      onSignIn?.();
      return;
    }
    if (isGoogleLoading) return;
    setGoogleError(null);
    setIsGoogleLoading(true);
    try {
      await onGoogleSignIn();
      setIsMenuOpen(false);
    } catch (err: any) {
      setGoogleError(err?.message || t('signInFailed'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setIsInstalled(true);
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Close the panel when the viewport shrinks or a navigation happens elsewhere.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [activeTab]);

  // A signed-in student must always see their own name here, never "Guest":
  // display name → stored name → email prefix (capitalised) → Student.
  const rawName = currentUser?.name || currentUser?.displayName || '';
  const emailPrefix = currentUser?.email ? String(currentUser.email).split('@')[0] : '';
  const prettyPrefix = emailPrefix
    ? emailPrefix.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : '';
  const userName = currentUser ? rawName || prettyPrefix || t('student') : t('guest');
  const userEmail = currentUser?.email || null;
  const userPhoto = currentUser?.photoURL || null;
  // How the account was created — Google, email, or not signed in at all.
  // (The User object only carries profile fields, so the provider is read from
  // Firebase Auth itself and falls back to "Email" when it is unavailable.)
  const providerIds: string[] =
    auth.currentUser?.providerData?.map((entry) => entry.providerId) || [];
  const accountKind = !currentUser
    ? t('guestAccount')
    : providerIds.includes('google.com')
      ? t('signedInWithGoogle')
      : t('signedInWithEmail');
  const showInstallRow = !isInstalled;

  const rowClass =
    'w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[#8AB4F8]/40 transition-all flex items-center justify-between gap-2 text-xs font-medium text-[var(--text-primary)] text-left';

  return (
    <header className="border-b border-[var(--border-color)] py-3 px-4 sm:px-6 md:px-12 flex items-center justify-between gap-3 bg-[var(--bg-primary)]/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
      <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => { onDashboard(); onTabChange('HOME'); }}>
        <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">EUEE</span>
        {!isOnline && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center gap-1">
            <WifiOff className="w-3 h-3" />
            <span>{t('offline')}</span>
          </span>
        )}
      </div>

      {(showNav ?? Boolean(currentUser)) && (
        <nav className="flex items-center gap-1 sm:gap-2 text-sm font-medium">
          <button
            onClick={() => { onDashboard(); onTabChange('HOME'); }}
            aria-current={activeTab === 'HOME' ? 'page' : undefined}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'HOME'
                ? 'text-[#8AB4F8] bg-[#8AB4F8]/10'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">{t('home')}</span>
          </button>
          <button
            onClick={() => { onDashboard(); onTabChange('MY_EXAM'); }}
            aria-current={activeTab === 'MY_EXAM' ? 'page' : undefined}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'MY_EXAM'
                ? 'text-[#8AB4F8] bg-[#8AB4F8]/10'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span className="hidden sm:inline">{t('myExams')}</span>
          </button>
        </nav>
      )}

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative" ref={menuRef}>
          {/*
            Icon only: the name (and the email) belongs inside the panel, which
            the student opens deliberately. A name printed in the header was
            exposing personal detail on every screen, and it competed with the
            navigation on small displays. It stays available to assistive tech
            through the label below.
          */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#8AB4F8]/50 transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md"
            title={t('accountMenu')}
            aria-label={`${t('accountMenu')} — ${userName}`}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            <div className="w-7 h-7 rounded-full bg-[#8AB4F8]/20 text-[#8AB4F8] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-3.5 h-3.5" />
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-[19rem] max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-5rem)] overflow-y-auto bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-3.5 z-50"
            >
              {/* Account: who am I? Always shown first in the panel. */}
              <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] mb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    {t('account')}
                  </span>
                  <span
                    className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border ${
                      currentUser
                        ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                        : 'text-[var(--text-secondary)] bg-[var(--bg-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    {accountKind}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#8AB4F8]/20 text-[#8AB4F8] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : userName ? (
                      userName.trim().charAt(0).toUpperCase()
                    ) : (
                      <UserIcon className="w-5 h-5 text-[#8AB4F8]" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {userName}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] truncate flex items-center gap-1">
                      {currentUser ? (
                        <>
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{userEmail || t('noEmailOnAccount')}</span>
                        </>
                      ) : (
                        <>
                          <UserIcon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{t('guestStatusDesc')}</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Install app */}
              {showInstallRow && (
                <div className="mb-2.5">
                  {isInstallable ? (
                    <button type="button" onClick={handleInstall} className={rowClass}>
                      <span className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-[#8AB4F8]" />
                        <span>{t('installApp')}</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#8AB4F8] text-slate-950 uppercase">
                        PWA
                      </span>
                    </button>
                  ) : (
                    <div className="px-3 py-2 rounded-xl bg-[var(--bg-primary)]/60 border border-dashed border-[var(--border-color)] flex items-start gap-2 text-[11px] text-[var(--text-secondary)] leading-snug">
                      <Smartphone className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#8AB4F8]" />
                      <span>{t('installAppHint')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Full screen */}
              {canUseFullScreen && (
                <div className="mb-2.5">
                  <button type="button" onClick={toggleFullScreen} className={rowClass}>
                    <span className="flex items-center gap-2">
                      {isFullScreen ? <Minimize className="w-4 h-4 text-[#8AB4F8]" /> : <Maximize className="w-4 h-4 text-[var(--text-secondary)]" />}
                      <span>{isFullScreen ? t('exitFullScreen') : t('fullScreen')}</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] uppercase">
                      {isFullScreen ? t('on') : t('off')}
                    </span>
                  </button>
                </div>
              )}

              {/* Theme */}
              <div className="mb-2.5">
                <button type="button" onClick={toggleTheme} className={rowClass}>
                  <span className="flex items-center gap-2">
                    {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                    <span>{t('themeMode')}</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                    {isDarkMode ? t('dark') : t('light')}
                  </span>
                </button>
              </div>

              {/* Language */}
              <div className="mb-3 pt-2 border-t border-[var(--border-color)]/60">
                <div className="px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Languages className="w-3 h-3 text-[#8AB4F8]" />
                  <span>{t('selectLanguage')}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {LANGUAGES.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setLanguage(item.code)}
                      aria-pressed={language === item.code}
                      className={`px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                        language === item.code
                          ? 'text-[#8AB4F8] font-bold bg-[#8AB4F8]/15 border border-[#8AB4F8]/30'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-accent)] border border-transparent'
                      }`}
                    >
                      <span className="truncate">{item.native}</span>
                      {language === item.code && <Check className="w-3 h-3 text-[#8AB4F8] shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Offline vault */}
              <div className="mb-3 px-2.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] min-w-0">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{t('offlineVault')}</span>
                </div>
                <span className="font-bold text-emerald-400 whitespace-nowrap">
                  {t('cachedExams', { count: cachedExamsCount })}
                </span>
              </div>

              {/* Sign out / sign in */}
              <div className="pt-2 border-t border-[var(--border-color)]/60">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('signOut')}</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="px-1 pb-0.5 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      {t('signInToSync')}
                    </div>
                    {googleError && (
                      <p className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-2 leading-relaxed text-left">
                        {googleError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading}
                      aria-busy={isGoogleLoading}
                      className="w-full px-3 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
                      ) : (
                        <GoogleIcon className="w-3.5 h-3.5" />
                      )}
                      <span>{t('googleSignIn')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onSignIn?.();
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-accent)] text-[var(--text-primary)] border border-[var(--border-color)] transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5 text-[#8AB4F8]" />
                      <span>{t('signInWithEmail')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
