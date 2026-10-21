import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase';

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
  logout: () => Promise<void>;
  isLoading: boolean;
  isInitializing: boolean;
  isFirebaseAuthed: boolean;
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

/** Translates Firebase error codes into actionable, non-leaky messages. */
function friendlyAuthError(error: any): string {
  const code = error?.code as string | undefined;
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'You appear to be offline. Connect to the internet to sign in, or continue as a guest.';
    case 'auth/operation-not-allowed':
      return 'Email sign-in is not enabled for this deployment. You can continue as a guest, or ask the administrator to enable Email/Password authentication.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorised for sign-in. Please contact the administrator.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return error?.message || 'Authentication failed. Please try again.';
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredSession());
  const [isFirebaseAuthed, setIsFirebaseAuthed] = useState<boolean>(() => !!auth.currentUser);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setIsFirebaseAuthed(true);
        const user = toUser(firebaseUser, getStoredSession());
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

  const login = async (emailInput: string, passwordInput: string) => {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    if (!email || !email.includes('@')) throw new Error('Please enter a valid email address.');
    if (!password) throw new Error('Please enter your password.');

    setIsActionLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = toUser(credential.user, getStoredSession());
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
        logout,
        isLoading: isInitializing || isActionLoading,
        isInitializing,
        isFirebaseAuthed,
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
