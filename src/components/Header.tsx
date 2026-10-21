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
  Home,
  FolderOpen,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useOffline } from '../contexts/OfflineContext';
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
  showNav,
}: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const { isOnline, isInstallable, promptInstall, cachedExamsCount } = useOffline();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(isStandaloneApp);
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

  const userName = currentUser?.name || currentUser?.displayName || t('guest');
  const userEmail = currentUser?.email || null;
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
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="px-3 sm:px-3.5 py-2 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#8AB4F8]/50 transition-all font-bold text-xs flex items-center gap-2.5 shadow-sm hover:shadow-md"
            title={t('accountMenu')}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            <div className="w-7 h-7 rounded-full bg-[#8AB4F8]/20 text-[#8AB4F8] flex items-center justify-center font-bold text-xs shrink-0">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold truncate max-w-[80px] sm:max-w-[140px]">
              {userName}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-[19rem] max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-5rem)] overflow-y-auto bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-3.5 z-50"
            >
              {/* Account: name + email */}
              <div className="flex items-center gap-3 p-2.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] mb-3">
                <div className="w-10 h-10 rounded-full bg-[#8AB4F8]/20 text-[#8AB4F8] flex items-center justify-center font-bold shrink-0">
                  <UserIcon className="w-5 h-5 text-[#8AB4F8]" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {userName}
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)] truncate flex items-center gap-1">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {userEmail || (currentUser ? t('noEmailOnAccount') : t('guestAccount'))}
                    </span>
                  </span>
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
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSignIn?.();
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-accent)] text-[var(--text-primary)] border border-[var(--border-color)] transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#8AB4F8]" />
                    <span>{t('signIn')}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
