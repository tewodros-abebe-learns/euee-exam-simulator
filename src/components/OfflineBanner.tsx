import { Wifi, WifiOff, RefreshCw, Download, X, CheckCircle2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useOffline } from '../contexts/OfflineContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function OfflineBanner() {
  const { 
    isOnline, 
    pendingSyncCount, 
    isSyncing, 
    triggerSync, 
    isInstallable, 
    promptInstall, 
    showOfflineToast, 
    dismissOfflineToast, 
    toastMessage,
    cachedExamsCount
  } = useOffline();
  const { t } = useLanguage();

  return (
    <>
      {/* 1. Permanent subtle offline bar when disconnected */}
      {!isOnline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-300 px-4 py-2 text-xs font-medium flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
          <div className="flex items-center gap-2 max-w-2xl">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="font-bold">Offline Practice Active</strong> — {cachedExamsCount} exam(s) available offline. Answers will auto-sync when you reconnect.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pendingSyncCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-200">
                {pendingSyncCount} changes queued
              </span>
            )}
          </div>
        </div>
      )}

      {/* 2. Floating Notification Toast for Reconnect / Status */}
      <AnimatePresence>
        {showOfflineToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 max-w-md w-[calc(100vw-3rem)] bg-[#121826] border border-[#2D3748] rounded-2xl shadow-2xl p-4 text-sm text-white flex items-start gap-3 backdrop-blur-xl"
          >
            <div className={`p-2 rounded-xl shrink-0 ${isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              {isOnline ? (
                isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                  {isOnline ? 'Network Reconnected' : 'Offline Mode Enabled'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {toastMessage || (isOnline ? 'You are back online. Everything is synced.' : 'Studying offline. Your saved exams and answers stay available without an internet connection.')}
              </p>

              {isOnline && pendingSyncCount > 0 && (
                <button
                  type="button"
                  onClick={() => triggerSync()}
                  disabled={isSyncing}
                  className="mt-2.5 px-3 py-1.5 rounded-lg bg-[#8AB4F8]/15 hover:bg-[#8AB4F8]/25 text-[#8AB4F8] border border-[#8AB4F8]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing Now...' : 'Sync Pending Progress'}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={dismissOfflineToast}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
