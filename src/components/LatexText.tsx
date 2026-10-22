import { Component, ReactNode } from 'react';
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

function sanitizeLatexInput(raw: string): string {
  // Strip dangerous html script tags, iframes, object/embed, and inline event handlers
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, 'blocked:');
}

export default function LatexText({ text }: { text: any }) {
  if (text === null || text === undefined) return null;
  const rawString = typeof text === 'string' ? text : String(text);
  if (!rawString.trim()) return null;
  const safeText = sanitizeLatexInput(rawString);

  return (
    <LatexErrorBoundary fallbackText={safeText}>
      <div className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        >
          {safeText}
        </ReactMarkdown>
      </div>
    </LatexErrorBoundary>
  );
}

