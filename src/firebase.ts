import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager
} from 'firebase/firestore';
import bundledConfig from '../firebase-applet-config.json';

// Support both standard Vercel environment variables (VITE_FIREBASE_*) and bundled config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || bundledConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || bundledConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || bundledConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || bundledConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || bundledConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || bundledConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || bundledConfig.measurementId || '',
};

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || bundledConfig.firestoreDatabaseId || undefined;

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      // Auto-detect instead of forcing long polling: streaming (WebChannel) is
      // fast and is what most students get, while a network that genuinely
      // blocks it still falls back on its own. Forcing long polling sent every
      // read and write through repeated HTTP requests on every device, which is
      // a large part of why the library felt sluggish and sometimes stalled.
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true
    },
    databaseId
  );
} catch {
  firestoreInstance = databaseId ? initializeFirestore(app, { ignoreUndefinedProperties: true }, databaseId) : initializeFirestore(app, { ignoreUndefinedProperties: true });
}

export const db = firestoreInstance;



