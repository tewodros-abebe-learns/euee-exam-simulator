import { Component, memo, type ReactNode } from 'react';
import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface LatexErrorBoundaryProps {
  fallbackText: string;
  children: ReactNode;
}

interface LatexErrorBoundaryState {
  hasError: boolean;
}

class LatexErrorBoundary extends Component<LatexErrorBoundaryProps, LatexErrorBoundaryState> {
  constructor(props: LatexErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("LaTeX parsing error gracefully recovered:", error);
  }

  render() {
    if (this.state.hasError) {
      return <span className="whitespace-pre-wrap font-sans">{this.props.fallbackText}</span>;
    }
    return this.props.children;
  }
}

/**
 * Exam text is authored by students, teachers or an AI, and it is rendered as
 * Markdown + KaTeX. Raw HTML is *not* enabled here (no `rehype-raw`), so tags in
 * the source are shown as text rather than executed, and link/image URLs already
 * pass through react-markdown's `defaultUrlTransform`, which blanks
 * `javascript:`, `vbscript:`, `file:` and unsafe `data:` URLs.
 *
 * The previous regex "sanitiser" was removed on purpose: it ran over the whole
 * string, including the mathematics, so ordinary phrases such as
 * "union = A ∪ B" had their text deleted (the `on=` pattern) and any expression
 * containing `javascript:` was rewritten. It bought no safety the renderer does
 * not already provide, and it corrupted real question text.
 */

/**
 * Parsing markdown + KaTeX is the most expensive thing on the exam and review
 * screens, and a question's text never changes while it is on screen. Memoising
 * it means a parent re-render (a tick, a filter, a new answer) no longer
 * re-parses every question on the page.
 */
function LatexText({ text }: { text: any }) {
  if (text === null || text === undefined) return null;
  const rawString = typeof text === 'string' ? text : String(text);
  if (!rawString.trim()) return null;
  return (
    <LatexErrorBoundary fallbackText={rawString}>
      <div className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
          // A link inside a question must never navigate the exam away, and it
          // must not hand the destination a window handle.
          components={{
            a: ({ href, children, ...props }) => (
              <a
                {...props}
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline text-blue-600 dark:text-blue-400"
              >
                {children}
              </a>
            ),
          }}
        >
          {rawString}
        </ReactMarkdown>
      </div>
    </LatexErrorBoundary>
  );
}

export default memo(LatexText);
