/**
 * Security headers that are safe to ship without a browser in the loop.
 *
 * A Content-Security-Policy is the one header that can lock a student out of
 * their own app: the wrong `connect-src` stops Firestore, and the wrong
 * `frame-src` breaks the Google sign-in pop-up. Rather than guess, the policy is
 * sent in **report-only** mode first — the browser enforces nothing, but it
 * names every blocked request in the console. Once that console is clean, the
 * same string can be sent under the enforcing header name.
 *
 * `vercel.json` carries the identical string for the static deployment, and a
 * test asserts the two never drift.
 */

export const CSP_REPORT_ONLY = [
  "default-src 'self'",
  // Firebase's pop-up helper is loaded from apis.google.com.
  "script-src 'self' https://apis.google.com",
  // Tailwind and KaTeX write inline styles.
  "style-src 'self' 'unsafe-inline'",
  // Google avatars, plus data: for the app's own icons and pdf.js blobs.
  "img-src 'self' data: blob: https://*.googleusercontent.com https://*.google.com https://www.gstatic.com",
  "font-src 'self' data:",
  [
    'connect-src',
    "'self'",
    'https://*.googleapis.com',
    'https://*.firebaseio.com',
    'wss://*.firebaseio.com',
    'https://*.firebaseapp.com',
    'https://*.cloudfunctions.net',
    'https://firestorage.googleapis.com',
  ].join(' '),
  // The sign-in pop-up and Firebase's auth iframe.
  "frame-src https://*.firebaseapp.com https://accounts.google.com https://apis.google.com",
  // pdf.js runs its worker from a bundled file (blob: covers the fallback).
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'self'",
].join('; ');

/** Only ever served over HTTPS (Vercel), so this cannot strand a visitor. */
export const STRICT_TRANSPORT_SECURITY = 'max-age=63072000; includeSubDomains; preload';
