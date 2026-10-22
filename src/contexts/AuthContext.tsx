import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase';
import {
  friendlyAuthError,
  isUserCancelledError,
} from '../lib/authErrors';

export interface User {
  email: string | null;
  name: string | null;
  uid: string;
  photoURL?: string | null;
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isInitializing: boolean;
  isFirebaseAuthed: boolean;
  /** Set when a Google redirect came back with an error we could not show inline. */
  authError: string | null;
  clearAuthError: () => void;
}

/**
 * Only the *profile* of the last signed-in user is cached, so the app can keep
 * working offline. Credentials are never stored on the device — the previous
 * implementation kept a base64 "hash" of every password in localStorage and
 * silently created accounts for any email typed at the sign-in screen.
 */
const ACTIVE_USER_SESSION_KEY = 'euee_active_user_session';

function getStoredSession(): User | null {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.uid !== 'string') return null;
    return {
      uid: parsed.uid,
      email: parsed.email ?? null,
      name: parsed.name ?? null,
      photoURL: parsed.photoURL ?? null,
    };
  } catch {
    return null;
  }
}

function setStoredSession(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(ACTIVE_USER_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(ACTIVE_USER_SESSION_KEY);
    }
  } catch {
    // Storage can be unavailable in private mode; session then lasts for the tab.
  }
}

/**
 * The cached profile is only a fallback for *offline* rendering of the same
 * account. Reusing it for a different uid would show one student's name and
 * photo to another, so the uid has to match.
 */
function matchingFallback(firebaseUser: FirebaseUser): User | null {
  const cached = getStoredSession();
  return cached && cached.uid === firebaseUser.uid ? cached : null;
}

function toUser(firebaseUser: FirebaseUser, fallback?: User | null): User {
  const email = firebaseUser.email || fallback?.email || null;
  return {
    uid: firebaseUser.uid,
    email,
    name:
      firebaseUser.displayName ||
      fallback?.name ||
      (email ? email.split('@')[0] : 'Student'),
    photoURL: firebaseUser.photoURL || fallback?.photoURL || null,
  };
}

/** Pop-ups are unusable when the page is running inside an iframe preview. */
function isEmbeddedFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Installed PWAs have no reliable pop-up return path, so they redirect. */
function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (window.navigator as any).standalone === true
  );
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredSession());
  const [isFirebaseAuthed, setIsFirebaseAuthed] = useState<boolean>(() => !!auth.currentUser);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // Guards against a double click opening two pop-ups.
  const inFlightRef = useRef(false);

  // Failsafe: if Firebase Auth never reports back (blocked network, a broken
  // config, a stalled service worker), the app must not sit on a spinner. The
  // cached profile already lets a returning student use the app offline.
  useEffect(() => {
    if (!isInitializing) return;
    const failsafe = window.setTimeout(() => setIsInitializing(false), 8000);
    return () => window.clearTimeout(failsafe);
  }, [isInitializing]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setIsFirebaseAuthed(true);
        const user = toUser(firebaseUser, matchingFallback(firebaseUser));
        setCurrentUser(user);
        setStoredSession(user);
      } else {
        // Firebase persists its own session locally, so a null user means the
        // account is genuinely signed out — never keep a stale signed-in UI.
        setIsFirebaseAuthed(false);
        setCurrentUser(null);
        setStoredSession(null);
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  // A redirect-based Google sign-in lands back on this page; pick up the
  // credential (or the error) once, before the user does anything else.
  useEffect(() => {
    let cancelled = false;
    getRedirectResult(auth)
      .then((result) => {
        if (cancelled || !result?.user) return;
        // onAuthStateChanged already stores the profile; nothing else to do.
      })
      .catch((error: any) => {
        if (cancelled) return;
        // A cancelled redirect is not an error worth showing.
        if (isUserCancelledError(error)) return;
        setAuthError(friendlyAuthError(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithGoogle = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsActionLoading(true);
    setAuthError(null);

    const provider = new GoogleAuthProvider();
    // Always let the student pick which Google account to use.
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      if (isStandaloneApp()) {
        // Installed apps cannot return from a pop-up; the redirect flow comes
        // back to the app window instead.
        await signInWithRedirect(auth, provider);
        return;
      }

      try {
        const credential = await signInWithPopup(auth, provider);
        const user = toUser(credential.user, matchingFallback(credential.user));
        setCurrentUser(user);
        setStoredSession(user);
      } catch (popupError: any) {
        const code = popupError?.code as string | undefined;
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          // Pop-up was blocked but we are not in a frame: the redirect flow
          // works just as well and needs no user action.
          if (isEmbeddedFrame()) throw popupError;
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (isUserCancelledError(error)) {
        // The student changed their mind: no error banner.
        return;
      }
      // A preview iframe can block the popup without reporting a useful code.
      if (
        isEmbeddedFrame() &&
        (code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment' ||
          code === 'auth/internal-error' ||
          code === 'auth/web-storage-unsupported')
      ) {
        throw new Error(
          'Google sign-in needs its own window. Open the app in a new tab and try again, or sign in with your email and password.'
        );
      }
      throw new Error(friendlyAuthError(error));
    } finally {
      inFlightRef.current = false;
      setIsActionLoading(false);
    }
  };

  const login = async (emailInput: string, passwordInput: string) => {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    if (!email || !email.includes('@')) throw new Error('Please enter a valid email address.');
    if (!password) throw new Error('Please enter your password.');

    setIsActionLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = toUser(credential.user, matchingFallback(credential.user));
      setCurrentUser(user);
      setStoredSession(user);
    } catch (error: any) {
      throw new Error(friendlyAuthError(error));
    } finally {
      setIsActionLoading(false);
    }
  };

  const signup = async (emailInput: string, passwordInput: string, nameInput: string) => {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();
    const name = nameInput.trim() || email.split('@')[0];

    if (!email || !email.includes('@')) throw new Error('Please enter a valid email address.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    setIsActionLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        try {
          await updateProfile(credential.user, { displayName: name });
        } catch {
          // A display-name failure must not block a successful registration.
        }
      }
      const user = toUser(credential.user, { uid: credential.user.uid, email, name, photoURL: null });
      setCurrentUser(user);
      setStoredSession(user);
    } catch (error: any) {
      throw new Error(friendlyAuthError(error));
    } finally {
      setIsActionLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Firebase sign-out failed (local session is cleared anyway):', error);
    } finally {
      setStoredSession(null);
      setCurrentUser(null);
      setIsFirebaseAuthed(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        signup,
        loginWithGoogle,
        logout,
        isLoading: isInitializing || isActionLoading,
        isInitializing,
        isFirebaseAuthed,
        authError,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
