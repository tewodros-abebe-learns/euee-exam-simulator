/** Translates Firebase error codes into actionable, non-leaky messages. */
export function friendlyAuthError(error: any): string {
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
      return 'This sign-in method is not enabled for this deployment. You can continue as a guest, or ask the administrator to enable it in the Firebase console.';
    case 'auth/account-exists-with-different-credential':
      return 'An account with this email already exists. Sign in with your email and password instead.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Please allow pop-ups for this site and try again.';
    case 'auth/web-storage-unsupported':
      return 'Your browser is blocking the storage Google sign-in needs. Try a normal (non-private) window, or sign in with your email and password.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorised for Google sign-in. Please contact the administrator.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return error?.message || 'Authentication failed. Please try again.';
  }
}

/** True when the student simply closed the Google window — not an error. */
export function isUserCancelledError(error: any): boolean {
  const code = error?.code as string | undefined;
  return (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/user-cancelled'
  );
}
