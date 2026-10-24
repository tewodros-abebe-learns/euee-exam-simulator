import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { CSP_REPORT_ONLY, STRICT_TRANSPORT_SECURITY } from '../server/securityHeaders';

/**
 * Cheap, source-level guards for the exact classes of bug this project has
 * already shipped once. Each one is a rule that is easy to state, impossible to
 * test through the UI in a unit test, and expensive to rediscover in production.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const sourceFiles = walk(SRC).filter(
  (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.test.ts')
);

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

/**
 * Comments in this codebase explain the bugs being guarded against, and those
 * explanations quote the very patterns the guards look for. Scanning strips them
 * so a comment can never fail (or silence) a check.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function offenders(check: (file: string, source: string) => boolean): string[] {
  return sourceFiles
    .filter((file) => check(file, stripComments(read(file))))
    .map((file) => relative(ROOT, file));
}

test('no file outside the scroll lock writes body overflow directly', () => {
  // Three components each owning `document.body.style.overflow` meant the first
  // dialog to close unlocked the page under the other one.
  const found = offenders(
    (file, source) =>
      !file.endsWith('scrollLock.ts') &&
      !file.endsWith('scrollLock.test.ts') &&
      /document\.body\.style\.overflow\s*=/.test(source)
  );
  assert.deepEqual(found, [], `Use lockScroll()/unlockScroll() instead: ${found.join(', ')}`);
});

test('a review of missed questions never invents an exam id', () => {
  // `…_missed_<timestamp>` produced results that pointed at no exam and could
  // never be reached again.
  // Matched inside a template literal only, so the explanation comments that
  // describe the old bug do not trip the guard.
  const found = offenders((_file, source) => /`[^`\n]*_missed_[^`\n]*`/.test(source));
  assert.deepEqual(found, [], `A review is practice and must not create ids: ${found.join(', ')}`);
});

test('Firestore is not forced onto long polling', () => {
  // Every read and write went through repeated HTTP requests; auto-detection
  // gets streaming where it works and still falls back where it does not.
  const firebase = stripComments(read(join(SRC, 'firebase.ts')));
  assert.ok(
    !/experimentalForceLongPolling\s*:\s*true/.test(firebase),
    'Use experimentalAutoDetectLongPolling instead of forcing long polling.'
  );
});

test('nothing loads a script or worker from a third-party CDN', () => {
  // The app promises to work offline; a CDN fallback breaks that promise behind
  // the student's back.
  const found = offenders((_file, source) => /unpkg\.com|cdn\.jsdelivr|cdnjs\.cloudflare/.test(source));
  assert.deepEqual(found, [], `Bundle it instead of fetching from a CDN: ${found.join(', ')}`);
});

test('the AI endpoint declares the time it needs', () => {
  // Without this the platform killed long extractions mid-generation.
  const api = stripComments(read(join(ROOT, 'api', 'generate-exam.ts')));
  assert.match(api, /export\s+const\s+maxDuration\s*=\s*\d+/);
});

test('the AI upload cap stays below the serverless body limit', () => {
  // Base64 inflates a file by a third, and the platform rejects a body over
  // ~4.5 MB before the function is even invoked.
  const app = stripComments(read(join(SRC, 'App.tsx')));
  const match = /MAX_AI_UPLOAD_BYTES\s*=\s*(\d+)\s*\*\s*1024\s*\*\s*1024/.exec(app);
  assert.ok(match, 'MAX_AI_UPLOAD_BYTES must stay an explicit, documented constant.');
  const megabytes = Number(match![1]);
  assert.ok(megabytes <= 3, `A ${megabytes} MB AI upload becomes more than 4 MB of base64.`);
});

test('both locales define exactly the same keys, and every used key exists', () => {
  // The product ships English and Amharic only. A missing translation silently
  // falls back to English mid-sentence; an undefined key renders its own name.
  const translations = read(join(SRC, 'i18n', 'translations.ts'));
  const enStart = translations.indexOf('en: {');
  const amStart = translations.indexOf('am: {');
  assert.ok(enStart !== -1 && amStart !== -1, 'translations.ts must export en and am blocks.');

  const keyPattern = /^\s{4}([A-Za-z0-9_]+):/gm;
  const keysOf = (block: string) => [...block.matchAll(keyPattern)].map((match) => match[1]);
  const en = new Set(keysOf(translations.slice(enStart, amStart)));
  const am = new Set(keysOf(translations.slice(amStart)));

  const missingInAmharic = [...en].filter((key) => !am.has(key));
  const missingInEnglish = [...am].filter((key) => !en.has(key));
  assert.deepEqual(missingInAmharic, [], 'Untranslated keys (English only).');
  assert.deepEqual(missingInEnglish, [], 'Keys defined only in Amharic.');

  const used = new Set<string>();
  for (const file of [...sourceFiles, join(SRC, 'i18n', 'translations.ts')]) {
    for (const match of read(file).matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'/g)) used.add(match[1]);
  }
  const undefinedKeys = [...used].filter((key) => !en.has(key));
  assert.deepEqual(undefinedKeys, [], 't() calls with a key that does not exist.');
});

test('the review screen never prints an answer option as a raw string', () => {
  // An option stored as `$5\ \text{m/s east}$` used to reach the screen with its
  // dollar signs and backslashes intact, right below an explanation that
  // rendered the same notation properly.
  const summary = stripComments(read(join(SRC, 'components', 'SummaryPage.tsx')));
  assert.ok(
    summary.includes('function AnswerText'),
    'SummaryPage must format answers through AnswerText.'
  );
  // Anything the student typed or the key supplies is an answer; both are
  // options and both go through AnswerText.
  // `={userAnswer}` is how the value is handed to <AnswerText />, so only a
  // brace that is *not* an attribute (i.e. rendered as a child) is a leak.
  const bareAnswer = /(?<!=)\{\s*(userAnswer|correctAnswer)\s*(\?\?|\}|\s*&&)/.exec(summary);
  assert.equal(bareAnswer, null, `Render the answer via <AnswerText />: ${bareAnswer?.[0]}`);
});

test('the home screen offers each way to build an exam exactly once', () => {
  // The panel carried "Upload Exam" as a heading and "Upload New Exam" as its
  // button, so the same feature looked like two of them.
  const home = stripComments(read(join(SRC, 'components', 'Home.tsx')));
  const labels = new Set(
    [...home.matchAll(/t\('(uploadExam|uploadNewExam)'\)/g)].map((match) => match[1])
  );
  assert.ok(
    !(labels.has('uploadExam') && labels.has('uploadNewExam')),
    'The home panel must not both title itself "Upload Exam" and offer an "Upload New Exam" button.'
  );
  assert.ok(labels.size > 0, 'The home panel must still offer a way to upload.');
});

test('the deployment and the server send the same security headers', () => {
  // The policy lives in one module and is duplicated into vercel.json because a
  // static deployment cannot import code. Duplication drifts; this catches it.
  const config = JSON.parse(read(join(ROOT, 'vercel.json'))) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const globalHeaders = config.headers.find((entry) => entry.source === '/(.*)');
  assert.ok(globalHeaders, 'vercel.json must keep a catch-all header block.');

  const byName = new Map(globalHeaders!.headers.map((header) => [header.key, header.value]));
  assert.equal(
    byName.get('Content-Security-Policy-Report-Only'),
    CSP_REPORT_ONLY,
    'vercel.json drifted from src/server/securityHeaders.ts.'
  );
  assert.equal(byName.get('Strict-Transport-Security'), STRICT_TRANSPORT_SECURITY);
  // Enforcing the policy before it has been verified in a browser would break
  // sign-in; it must stay report-only until someone proves the console is clean.
  assert.ok(!byName.has('Content-Security-Policy'));
  assert.match(CSP_REPORT_ONLY, /frame-src [^;]*accounts\.google\.com/);
  assert.match(CSP_REPORT_ONLY, /connect-src [^;]*googleapis\.com/);
});
