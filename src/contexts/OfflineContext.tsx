import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { offlineStorage, type OfflineExam, type OfflineSession } from '../lib/offlineStorage';
import { useLanguage } from './LanguageContext';
import { db, auth } from '../firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface OfflineContextType {
  isOnline: boolean;
  isOfflineReady: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  cachedExamsCount: number;
  isInstallable: boolean;
  promptInstall: () => Promise<boolean>;
  triggerSync: () => Promise<void>;
  saveExamLocally: (exam: OfflineExam) => Promise<void>;
  saveSessionLocally: (session: OfflineSession) => Promise<void>;
  getOfflineExamsList: (subject?: string) => Promise<OfflineExam[]>;
  getOfflineSessionData: (sessionId: string) => Promise<OfflineSession | null>;
  showOfflineToast: boolean;
  dismissOfflineToast: () => void;
  toastMessage: string | null;
  toastTitle: string | null;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isOfflineReady, setIsOfflineReady] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cachedExamsCount, setCachedExamsCount] = useState<number>(0);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [showOfflineToast, setShowOfflineToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTitle, setToastTitle] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const stats = await offlineStorage.getStats();
      setCachedExamsCount(stats.cachedExamsCount);
      setPendingSyncCount(stats.pendingSyncCount);
    } catch (e) {
      console.warn('Could not refresh offline stats:', e);
    }
  }, []);

  // 1. Initialize IndexedDB and Service Worker
  useEffect(() => {
    const initPWA = async () => {
      try {
        await offlineStorage.init();
        setIsOfflineReady(true);
        await refreshStats();
      } catch (err) {
        console.warn('IndexedDB initialization notice:', err);
      }

      // Register the service worker for installed/PWA use in production only.
      // Registering it in dev would cache Vite's unbundled module graph.
      if (
        import.meta.env.PROD &&
        'serviceWorker' in navigator &&
        window.location.protocol.startsWith('http')
      ) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          console.info('PWA Service Worker successfully registered with scope:', registration.scope);
        } catch (swErr) {
          console.warn('Service Worker registration skipped or failed:', swErr);
        }
      }
    };

    initPWA();
  }, [refreshStats]);

  // 2. Listen to beforeinstallprompt for PWA installation
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setToastMessage(t('appInstalledToast'));
      setToastTitle(t('appInstalledTitle'));
      setShowOfflineToast(true);
      window.setTimeout(() => setShowOfflineToast(false), 6000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [t]);

  // 3. Online/Offline Network Event Listeners & Automatic Sync Trigger
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setToastMessage(null);
      setToastTitle(null);
      setShowOfflineToast(true);
      setTimeout(() => setShowOfflineToast(false), 4000);
      await triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToastMessage(null);
      setToastTitle(null);
      setShowOfflineToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 4. Synchronization Logic
  //    Pushes every unsynced local session (not only queued ones) and any
  //    exams created offline, then marks them as synced.
  const triggerSync = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser) return;

    setIsSyncing(true);
    try {
      const queue = await offlineStorage.getSyncQueue();

      // 4a. Exams created while offline are uploaded under their local id.
      for (const item of queue) {
        if (item.type !== 'CREATE_EXAM') continue;
        try {
          const exam = item.payload as OfflineExam;
          if (exam?.id && exam.createdBy === currentAuthUser.uid) {
            await setDoc(doc(db, 'exams', exam.id), {
              title: exam.title,
              subject: exam.subject,
              grade: exam.grade,
              questions: exam.questions,
              createdBy: currentAuthUser.uid,
              createdAt: serverTimestamp(),
            });
          }
          if (item.id) await offlineStorage.clearSyncQueueItem(item.id);
        } catch (itemErr) {
          console.warn('Offline exam sync failed, will retry on the next connection:', itemErr);
        }
      }

      // 4b. Every stored session that still needs mirroring.
      const sessions = await offlineStorage.getAllSessions(currentAuthUser.uid);
      for (const session of sessions) {
        if (session.syncedWithCloud) continue;
        if (session.userId !== currentAuthUser.uid) continue;
        if (!session.id || session.id.startsWith('guest-')) continue;
        try {
          await setDoc(
            doc(db, 'user_exams', session.id),
            {
              userId: currentAuthUser.uid,
              examId: session.examId,
              status: session.status || 'IN_PROGRESS',
              answers: session.answers || {},
              score: session.score ?? null,
              total: session.total ?? null,
              percentage: session.percentage ?? null,
              startTime: session.startTime,
              timeLimit: session.timeLimit,
              duration: session.timeSpent ?? null,
              lastUpdated: serverTimestamp(),
            },
            { merge: true }
          );
          await offlineStorage.markSessionSynced(session.id);
        } catch (sessionErr) {
          console.warn('Session sync failed, will retry on the next connection:', sessionErr);
        }
      }

      // 4c. Remove queue entries that no longer need replaying.
      for (const item of queue) {
        if (item.type === 'CREATE_EXAM') continue;
        if (item.id) {
          try {
            await offlineStorage.clearSyncQueueItem(item.id);
          } catch {
            // Ignore: the queue is best-effort.
          }
        }
      }

      await refreshStats();
    } catch (syncErr) {
      console.warn('Offline sync cycle notice:', syncErr);
    } finally {
      setIsSyncing(false);
    }
  }, [refreshStats]);

  // 5. Prompt Install Trigger
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  const saveExamLocally = useCallback(async (exam: OfflineExam) => {
    await offlineStorage.saveExam(exam);
    // Exams created offline for a signed-in user must be replayed later,
    // otherwise they only ever exist on this device.
    if (!navigator.onLine && exam.createdBy && exam.createdBy !== 'guest') {
      await offlineStorage.addToSyncQueue({
        type: 'CREATE_EXAM',
        payload: exam,
        timestamp: Date.now(),
      });
    }
    await refreshStats();
  }, [refreshStats]);

  const saveSessionLocally = useCallback(async (session: OfflineSession) => {
    await offlineStorage.saveSession(session);
    if (!session.syncedWithCloud) {
      await offlineStorage.addToSyncQueue({
        type: 'SAVE_SESSION',
        payload: session,
        timestamp: Date.now(),
      });
    }
    await refreshStats();
  }, [refreshStats]);

  const getOfflineExamsList = useCallback(async (subject?: string) => {
    return offlineStorage.getAllExams(subject);
  }, []);

  const getOfflineSessionData = useCallback(async (sessionId: string) => {
    return offlineStorage.getSession(sessionId);
  }, []);

  const dismissOfflineToast = useCallback(() => {
    setShowOfflineToast(false);
  }, []);

  const contextValue = useMemo<OfflineContextType>(
    () => ({
      isOnline,
      isOfflineReady,
      pendingSyncCount,
      isSyncing,
      cachedExamsCount,
      isInstallable,
      promptInstall,
      triggerSync,
      saveExamLocally,
      saveSessionLocally,
      getOfflineExamsList,
      getOfflineSessionData,
      showOfflineToast,
      dismissOfflineToast,
      toastMessage,
      toastTitle,
    }),
    [
      isOnline,
      isOfflineReady,
      pendingSyncCount,
      isSyncing,
      cachedExamsCount,
      isInstallable,
      promptInstall,
      triggerSync,
      saveExamLocally,
      saveSessionLocally,
      getOfflineExamsList,
      getOfflineSessionData,
      showOfflineToast,
      dismissOfflineToast,
      toastMessage,
      toastTitle,
    ]
  );

  return <OfflineContext.Provider value={contextValue}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineContextType {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
