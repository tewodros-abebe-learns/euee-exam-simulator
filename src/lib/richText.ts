/**
 * Does a short string need rendering, or can it be shown as typed?
 *
 * Answer options are usually plain words ("5 m/s east"), and passing those
 * through the Markdown + KaTeX pipeline changes them: `a*b*c` loses its
 * asterisks, `x_1` turns into an italic "x". So an option is only rendered
 * when it actually carries markup — the same heuristic the review screen uses
 * to decide between formatted output and the string as written.
 *
 * The test for maths is deliberately conservative: a lone `$` price ("Cost is
 * $5") is not a formula, so it stays literal.
 */

const MATH_DELIMITERS = /\$[^$]+\$|\\\(|\\\[|\\[a-zA-Z]{2,}/;
const OTHER_MARKUP = /\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\]\([^)]+\)/;

export function hasRichText(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text) return false;
  return MATH_DELIMITERS.test(text) || OTHER_MARKUP.test(text);
}
