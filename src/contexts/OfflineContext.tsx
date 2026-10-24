import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { offlineStorage, type OfflineExam, type OfflineSession } from '../lib/offlineStorage';
import { useLanguage } from './LanguageContext';
import { db, auth } from '../firebase';
import { runWithTimeout, readWithTimeout, LOCAL_WRITE_TIMEOUT_MS, CLOUD_WRITE_TIMEOUT_MS } from '../lib/cloudWrite';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { shouldRetireQueueItem } from '../lib/syncQueue';

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
  /** Queues an exam whose cloud write did not complete, for replay on reconnect. */
  queueExamForSync: (exam: OfflineExam) => Promise<void>;
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

  // 3. Synchronization Logic
  //    Pushes every unsynced local session (not only queued ones) and any
  //    exams created offline, then marks them as synced.
  const syncInFlightRef = useRef(false);
  const triggerSync = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser) return;
    // Two triggers (reconnect + a manual retry) must never replay the same
    // queue twice: the second call simply joins the run already in progress.
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;

    setIsSyncing(true);
    const syncedSessionIds = new Set<string>();
    try {
      // A blocked database must not leave `isSyncing` stuck on forever.
      const queue = await readWithTimeout(
        () => offlineStorage.getSyncQueue(),
        [],
        LOCAL_WRITE_TIMEOUT_MS,
        'Read the replay queue'
      );

      // 3a. Exams created while offline are uploaded under their local id.
      for (const item of queue) {
        if (item.type !== 'CREATE_EXAM') continue;
        try {
          const queuedExam = item.payload as OfflineExam;
          let uploaded = true;
          if (queuedExam?.id && queuedExam.createdBy === currentAuthUser.uid) {
            // The queued payload is a snapshot from creation time, but the
            // student may have renamed or moved the paper since (while offline
            // those edits only touch the device copy). Upload the freshest
            // record so the cloud copy is not born out of date.
            let exam = queuedExam;
            try {
              const local = await offlineStorage.getExamById(queuedExam.id);
              if (local) exam = { ...queuedExam, ...local };
            } catch {
              // Fall back to the queued snapshot.
            }
            uploaded = await runWithTimeout(
              () =>
                setDoc(doc(db, 'exams', exam.id), {
                  title: exam.title,
                  subject: exam.subject,
                  grade: exam.grade,
                  questions: exam.questions,
                  createdBy: currentAuthUser.uid,
                  createdAt: serverTimestamp(),
                  ...(exam.timeLimit ? { timeLimit: exam.timeLimit } : {}),
                }),
              CLOUD_WRITE_TIMEOUT_MS,
              'Offline exam sync'
            );
          }
          // Keep the entry queued if the backend never acknowledged it.
          if (uploaded && item.id) await offlineStorage.clearSyncQueueItem(item.id);
        } catch (itemErr) {
          console.warn('Offline exam sync failed, will retry on the next connection:', itemErr);
        }
      }

      // 3b. Every stored session that still needs mirroring.
      const sessions = await readWithTimeout(
        () => offlineStorage.getAllSessions(currentAuthUser.uid),
        [],
        LOCAL_WRITE_TIMEOUT_MS,
        'Read device attempts for sync'
      );
      for (const session of sessions) {
        if (session.syncedWithCloud) continue;
        if (session.userId !== currentAuthUser.uid) continue;
        if (!session.id || session.id.startsWith('guest-')) continue;
        try {
          const written = await runWithTimeout(
            () =>
              setDoc(
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
              ),
            CLOUD_WRITE_TIMEOUT_MS,
            'Session sync'
          );
          if (!written) continue;
          await offlineStorage.markSessionSynced(session.id);
          syncedSessionIds.add(session.id);
        } catch (sessionErr) {
          console.warn('Session sync failed, will retry on the next connection:', sessionErr);
        }
      }

      // 3c. Remove queue entries that no longer need replaying.
      //
      //     Three cases are finished business: the session was mirrored during
      //     this run, the app already wrote it directly (in which case it is
      //     flagged `syncedWithCloud` and step 3b skipped it), or the session no
      //     longer exists. Previously only the first case was recognised, so
      //     every finished attempt left a permanent entry behind and the
      //     "changes queued" badge only ever went up.
      const retireContext = { sessions, syncedNow: syncedSessionIds };
      for (const item of queue) {
        if (item.type === 'CREATE_EXAM') continue;
        // A genuine unsent attempt keeps its entry so the next cycle retries.
        if (item.type === 'SAVE_SESSION' && !shouldRetireQueueItem(item, retireContext)) continue;
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
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshStats]);

  // 4. Online/Offline Network Event Listeners & Automatic Sync Trigger
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
  }, [triggerSync]);

  // 4b. Sync once on startup and whenever a session appears.
  //
  //     Replaying only on the browser's `online` event meant work created
  //     offline — or before a failed write — could sit on the device
  //     indefinitely, and a freshly signed-in student never pulled it up either.
  //     `triggerSync` already refuses to run twice concurrently and returns
  //     immediately when there is no account or no connection.
  useEffect(() => {
    if (!isOfflineReady) return;

    const runOnce = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (!auth.currentUser) return;
      void triggerSync();
    };

    // A short delay lets Firebase restore its session and lets the first
    // screen paint before any background network work starts.
    const startup = window.setTimeout(runOnce, 2000);
    // Signing in (or restoring a session) is the other moment pending work
    // becomes replayable.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) window.setTimeout(runOnce, 0);
    });

    return () => {
      window.clearTimeout(startup);
      unsubscribe();
    };
  }, [isOfflineReady, triggerSync]);

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

  const queueExamForSync = useCallback(async (exam: OfflineExam) => {
    if (!exam?.id) return;
    try {
      await offlineStorage.addToSyncQueue({
        type: 'CREATE_EXAM',
        payload: exam,
        timestamp: Date.now(),
      });
      await refreshStats();
    } catch (error) {
      console.warn('Could not queue the exam for a later sync:', error);
    }
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
      queueExamForSync,
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
      queueExamForSync,
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
