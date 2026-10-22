import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { translations, type Language } from '../i18n/translations';

/**
 * The boundary sits above the language provider, so it cannot use `useLanguage`.
 * It reads the stored preference directly and falls back to English.
 */
function crashCopy(): (typeof translations)['en'] {
  let language: Language = 'en';
  try {
    const saved = window.localStorage.getItem('language');
    if (saved === 'am') language = 'am';
  } catch {
    // Storage blocked: English is always available.
  }
  return translations[language];
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const copy = crashCopy();
      let title = copy.appErrorTitle;
      let displayMessage = copy.appErrorDesc;

      // Internals never reach the screen. The old code printed the raw error
      // message (and, for database errors, the raw Firestore text) to the
      // student, which leaked library details and was untranslatable. Only the
      // "permission" case is worth distinguishing, because it has an action.
      try {
        const raw = this.state.error?.message;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && parsed.error) {
            if (String(parsed.error).includes('Missing or insufficient permissions')) {
              displayMessage = copy.appErrorPermission;
            }
          }
        }
      } catch {
        // Not one of our structured errors: the generic copy is already set.
      }

      return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
              {title}
            </h2>
            <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
              {displayMessage}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-[#8AB4F8] text-gray-900 py-4 rounded-2xl font-bold hover:bg-[#AECBFA] transition-all shadow-lg shadow-[#8AB4F8]/20 flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                {copy.reloadPage}
              </button>
              <button
                onClick={this.handleReset}
                className="w-full bg-white/5 text-[var(--text-primary)] py-4 rounded-2xl font-bold hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                {copy.home}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
