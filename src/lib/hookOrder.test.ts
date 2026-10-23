import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Regression guard for the crash that took the whole app down when the upload
 * dialog opened:
 *
 *   React has detected a change in the order of Hooks called by
 *   ExamUploadModal → "Rendered more hooks than during the previous render".
 *
 * The dialog returned `null` before some of its hooks ran, so a closed dialog
 * used three hooks and an open one used four. The rule is simple and needs no
 * browser to check: inside one component, no hook may run after an early
 * `return` that a later render might skip.
 *
 * Each top-level declaration is checked separately, so a hook-free helper that
 * returns early (e.g. `Metric`) is not confused with the component below it.
 */

const SRC = join(process.cwd(), 'src');
const TOP_LEVEL = /^(?:export\s+)?(?:default\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/;
const HOOK_LINE = /^\s*(?:const\s+\{[^}]*\}\s*=\s*)?(?:const\s+\[[^\]]*\]\s*=\s*)?(?:const\s+\w+\s*=\s*)?use[A-Z]\w*\s*\(/;
const EARLY_RETURN = /^\s{2}if\s*\(.*\)\s*(?:return\b|\{\s*$)/;

interface Block {
  file: string;
  name: string;
  startLine: number;
  lines: string[];
}

function collectBlocks(file: string, source: string): Block[] {
  const lines = source.split('\n');
  const blocks: Block[] = [];
  let current: Block | null = null;

  lines.forEach((line, index) => {
    const top = TOP_LEVEL.exec(line);
    if (top) {
      if (current) blocks.push(current);
      current = { file, name: top[1], startLine: index + 1, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  });
  if (current) blocks.push(current);

  // Only components (capitalised) can violate the rules of hooks here.
  return blocks.filter((block) => /^[A-Z]/.test(block.name));
}

function sourceFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.tsx')) files.push(full);
    }
  };
  walk(SRC);
  return files;
}

test('no component calls a hook after an early return', () => {
  const offenders: string[] = [];

  for (const file of sourceFiles()) {
    const source = readFileSync(file, 'utf8');
    for (const block of collectBlocks(file, source)) {
      const hookLines: number[] = [];
      block.lines.forEach((line, index) => {
        if (HOOK_LINE.test(line)) hookLines.push(index);
      });
      if (hookLines.length === 0) continue;

      const lastHook = hookLines[hookLines.length - 1];
      for (let index = 0; index <= lastHook; index += 1) {
        if (!EARLY_RETURN.test(block.lines[index])) continue;
        if (hookLines.some((hookLine) => hookLine > index)) {
          offenders.push(
            `${file}:${block.startLine + index + 1}: ${block.name} returns early before later hooks — "${block.lines[index].trim()}"`
          );
        }
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Every hook must run before any early return:\n${offenders.join('\n')}`
  );
});
