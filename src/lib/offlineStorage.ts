/**
 * Offline Storage Engine for EUEE Exam Simulator
 * Powered by IndexedDB for zero-latency, full-fidelity offline test taking & caching.
 */

import { type Question } from '../services/geminiService';
import { subjectMatchesFolder } from './subjectStore';

const DB_NAME = 'EUEE_Exam_Offline_DB';
const DB_VERSION = 1;

export interface OfflineExam {
  id: string;
  title: string;
  subject: string;
  grade: string;
  questions: Question[];
  createdBy?: string;
  createdAt: number;
  /** @deprecated Kept only so older cached records can be purged. */
  isSample?: boolean;
  isOfflineReady?: boolean;
  source?: 'custom' | 'cloud';
}

export interface OfflineSession {
  id: string;
  examId: string;
  userId?: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  answers: Record<string, string>;
  score?: number;
  total?: number;
  percentage?: number;
  startTime: number;
  timeLimit: number;
  timeSpent?: number;
  lastUpdated: number;
  syncedWithCloud: boolean;
}

export interface SyncQueueItem {
  id?: number;
  type: 'SAVE_SESSION' | 'CREATE_EXAM';
  payload: any;
  timestamp: number;
}

class OfflineStorageManager {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private readyPromise: Promise<void> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this browser environment.'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store 1: Exams
        if (!db.objectStoreNames.contains('exams')) {
          const examStore = db.createObjectStore('exams', { keyPath: 'id' });
          examStore.createIndex('subject', 'subject', { unique: false });
          examStore.createIndex('createdBy', 'createdBy', { unique: false });
        }

        // Store 2: User Sessions / Results
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('examId', 'examId', { unique: false });
          sessionStore.createIndex('userId', 'userId', { unique: false });
          sessionStore.createIndex('syncedWithCloud', 'syncedWithCloud', { unique: false });
        }

        // Store 3: Sync Queue
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Initializes the offline store.
   *
   * Earlier versions of the app shipped the 2015-2017 national papers inside
   * the bundle and copied them into IndexedDB on first launch. The bundled
   * papers are gone, so any records a returning device still has are purged
   * once here; user-created exams and their sessions are untouched.
   */
  async init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = (async () => {
      try {
        await this.getDB();
        // NOTE: read through the raw reader, never through getAllExams().
        // getAllExams() awaits `whenReady()`, which awaits this very promise —
        // that is a circular wait and the app would sit on its loading screen
        // forever (guest mode has no Firestore listener to rescue it).
        const existing = await this.readAllExams();
        const legacySamples = existing.filter((exam) => exam.isSample === true);
        for (const legacy of legacySamples) {
          await this.deleteExam(legacy.id);
        }
        if (legacySamples.length > 0) {
          console.info(`Removed ${legacySamples.length} previously bundled past papers from offline storage.`);
        }
      } catch (e) {
        console.warn('Could not initialize offline IndexedDB storage:', e);
        this.readyPromise = null;
      }
    })();
    return this.readyPromise;
  }

  /** Waits for the initialization sweep so first-load reads never race it. */
  private async whenReady(): Promise<void> {
    if (this.readyPromise) {
      try {
        await this.readyPromise;
      } catch {
        // A failed seed must not block reads.
      }
    }
  }


  // ==========================================
  // EXAM OPERATIONS
  // ==========================================
  async saveExam(exam: OfflineExam): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readwrite');
      const store = tx.objectStore('exams');
      const req = store.put({
        ...exam,
        isOfflineReady: true,
        lastCachedAt: Date.now()
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getExamById(id: string): Promise<OfflineExam | null> {
    await this.whenReady();
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readonly');
      const store = tx.objectStore('exams');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Reads every cached exam without waiting for initialization.
   * Only `init()` may use this — see the note inside `init()`.
   */
  private async readAllExams(): Promise<OfflineExam[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readonly');
      const store = tx.objectStore('exams');
      const req = store.getAll();
      req.onsuccess = () => {
        const results: OfflineExam[] = req.result || [];
        results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllExams(subject?: string): Promise<OfflineExam[]> {
    await this.whenReady();
    const results = await this.readAllExams();
    if (!subject || subject === 'All') return results;
    // Aliases and renamed folders matter here too: "Mathematics" belongs to
    // the "Math" folder, and a renamed folder keeps all of its papers.
    return results.filter((exam) => subjectMatchesFolder(exam.subject, subject));
  }

  async deleteExam(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readwrite');
      const store = tx.objectStore('exams');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ==========================================
  // SESSION & PROGRESS OPERATIONS
  // ==========================================
  async saveSession(session: OfflineSession): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      const req = store.put(session);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getSession(id: string): Promise<OfflineSession | null> {
    await this.whenReady();
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllSessions(userId?: string): Promise<OfflineSession[]> {
    await this.whenReady();
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const req = store.getAll();
      req.onsuccess = () => {
        let results: OfflineSession[] = req.result || [];
        if (userId) {
          results = results.filter(s => s.userId === userId || !s.userId);
        }
        results.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /** Flags a locally stored session as already mirrored to Firestore. */
  async markSessionSynced(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result as OfflineSession | undefined;
        if (!existing) {
          resolve();
          return;
        }
        const putReq = store.put({ ...existing, syncedWithCloud: true });
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async deleteSession(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ==========================================
  // SYNC QUEUE OPERATIONS
  // ==========================================
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.add(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async clearSyncQueueItem(id: number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getStats(): Promise<{ cachedExamsCount: number; offlineSessionsCount: number; pendingSyncCount: number }> {
    try {
      const [exams, sessions, queue] = await Promise.all([
        this.getAllExams(),
        this.getAllSessions(),
        this.getSyncQueue()
      ]);
      return {
        cachedExamsCount: exams.length,
        offlineSessionsCount: sessions.length,
        pendingSyncCount: queue.length
      };
    } catch {
      return { cachedExamsCount: 0, offlineSessionsCount: 0, pendingSyncCount: 0 };
    }
  }
}

export const offlineStorage = new OfflineStorageManager();
