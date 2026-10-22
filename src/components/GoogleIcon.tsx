/**
 * Google's official "G" mark, inlined so sign-in never depends on a network
 * request or a third-party script (the app must keep working offline).
 */
export default function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.44a5.52 5.52 0 0 1-2.4 3.62v3h3.86c2.26-2.09 3.59-5.17 3.59-8.86Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.9-2.91l-3.86-3c-1.08.72-2.45 1.15-4.04 1.15-3.11 0-5.74-2.1-6.68-4.92H1.34v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.32 14.32a7.2 7.2 0 0 1 0-4.63V6.6H1.34a12 12 0 0 0 0 10.8l3.98-3.08Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.58 1.79l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.34 6.6l3.98 3.09C6.26 6.87 8.89 4.76 12 4.76Z"
      />
    </svg>
  );
}
