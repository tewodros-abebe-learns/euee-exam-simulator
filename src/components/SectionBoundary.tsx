import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { translations, type Language } from '../i18n/translations';

/**
 * A boundary for one part of the page instead of the whole application.
 *
 * The upload dialog once crashed on a React hook-order mistake, and because the
 * only boundary was the root one, the header, the library and everything else
 * were replaced by a full-page error screen. Recovery meant reloading and
 * starting again. Containing a failure where it happens keeps the rest usable:
 * the student can still reach My Exams, and reopening the dialog (a new
 * `resetKey`) tries again.
 */

function copy(): (typeof translations)['en'] {
  let language: Language = 'en';
  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem('language') === 'am') {
      language = 'am';
    }
  } catch {
    // Blocked storage: English is always available.
  }
  return translations[language];
}

interface SectionBoundaryProps {
  children: ReactNode;
  /** Changing this clears the error, e.g. the dialog being reopened. */
  resetKey?: unknown;
  /** Compact renders a small inline card instead of a full panel. */
  compact?: boolean;
}

interface SectionBoundaryState {
  hasError: boolean;
}

export default class SectionBoundary extends Component<SectionBoundaryProps, SectionBoundaryState> {
  state: SectionBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept in the console for diagnosis; the student only sees plain words.
    console.error('A part of the page failed to render:', error, info.componentStack);
  }

  componentDidUpdate(previous: SectionBoundaryProps) {
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private retry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    const text = copy();

    if (this.props.compact) {
      return (
        <div className="m-4 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-red-400/30 text-[var(--text-primary)] text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold mb-1">{text.sectionErrorTitle}</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{text.sectionErrorDesc}</p>
          </div>
          <button
            type="button"
            onClick={this.retry}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-white/5 border border-[var(--border-color)] text-xs font-bold hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            {text.tryAgain}
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl">
        <div className="bg-red-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">{text.sectionErrorTitle}</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">{text.sectionErrorDesc}</p>
        <button
          type="button"
          onClick={this.retry}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#8AB4F8] text-gray-900 font-bold text-sm hover:bg-[#AECBFA] transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          {text.tryAgain}
        </button>
      </div>
    );
  }
}
