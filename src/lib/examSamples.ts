/**
 * Downloadable samples for every import format.
 *
 * Two artefacts per format:
 *  - a real, working exam file the app imports without errors, and
 *  - a prompt that tells an AI exactly how to produce that format, with the
 *    rules and a spread of question styles (plain, LaTeX, Amharic, true/false,
 *    five options, and one practice-only question with no key).
 *
 * Both are generated from the same question set, so the sample and the prompt
 * can never drift apart.
 */

export type SampleFormat = 'json' | 'markdown' | 'pdf' | 'csv' | 'text' | 'image';

interface SampleQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    question: 'Which organelle is the site of aerobic respiration in a eukaryotic cell?',
    options: ['Ribosome', 'Mitochondrion', 'Golgi apparatus', 'Lysosome'],
    correctAnswerIndex: 1,
    explanation: 'Mitochondria generate ATP by oxidative phosphorylation.',
  },
  {
    question: 'A body accelerates at $2\\ \\text{m/s}^2$ from rest. What is its velocity after 5 s?',
    options: ['$5\\ \\text{m/s}$', '$10\\ \\text{m/s}$', '$15\\ \\text{m/s}$', '$20\\ \\text{m/s}$'],
    correctAnswerIndex: 1,
    explanation: 'Using $v = u + at = 0 + 2 \\times 5 = 10\\ \\text{m/s}$.',
  },
  {
    question: 'የሚከተሉት መሠረታዊ መጠኖች የትኛው ነው?',
    options: ['ፍጥነት', 'ግዝፈት', 'ማጣደፍ', 'ኃይል'],
    correctAnswerIndex: 1,
    explanation: 'ግዝፈት (mass) መሠረታዊ መጠን ነው፤ ሌሎቹ ከመሠረታዊ መጠኖች የተገኙ ናቸው።',
  },
  {
    question: 'Water boils at 100 °C at standard atmospheric pressure.',
    options: ['True', 'False'],
    correctAnswerIndex: 0,
    explanation: 'At 1 atm the boiling point of water is 100 °C.',
  },
  {
    question: 'Which of the following is NOT a vector quantity?',
    options: ['Displacement', 'Velocity', 'Acceleration', 'Speed'],
    correctAnswerIndex: 3,
    explanation: 'Speed has magnitude only; the others have magnitude and direction.',
  },
  {
    question: 'Which reagent tests for carbon dioxide gas?',
    options: ['Limewater', 'Universal indicator', 'Benedict’s solution', 'Litmus paper', 'Silver nitrate'],
    correctAnswerIndex: 0,
    explanation: 'Carbon dioxide turns limewater milky as calcium carbonate precipitates.',
  },
  {
    question: 'Practice-only item: describe one function of the cell membrane.',
    options: ['It controls what enters and leaves the cell', 'It stores genetic material'],
    correctAnswerIndex: -1,
    explanation: 'This item is intentionally ungraded to show how missing keys are handled.',
  },
];

const META = {
  title: 'Sample Practice Exam',
  subject: 'Biology',
  grade: 'Grade 9',
  timeLimit: 1200,
};

const L = 'ABCDE';

/* -------------------------------------------------------------------------- */
/* Sample files                                                               */
/* -------------------------------------------------------------------------- */

export function buildSampleJson(): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      _readme: [
        'Any field prefixed with "_" is ignored by the importer.',
        'correctAnswerIndex is zero-based: 0 = first option. Use -1 for a practice-only question.',
        'The same file may use "correctAnswer": "B" instead of the index.',
      ],
      title: META.title,
      subject: META.subject,
      grade: META.grade,
      timeLimit: META.timeLimit,
      questions: SAMPLE_QUESTIONS.map((question, index) => ({
        id: `q${index + 1}`,
        question: question.question,
        options: question.options,
        correctAnswerIndex: question.correctAnswerIndex,
        explanation: question.explanation,
      })),
    },
    null,
    2
  );
}

export function buildSampleMarkdown(): string {
  const lines: string[] = [
    `# ${META.title}`,
    '',
    `Subject: ${META.subject}`,
    `Grade: ${META.grade}`,
    `Time limit: ${Math.round(META.timeLimit / 60)} minutes`,
    '',
    'Instructions: choose the best answer for each question.',
    '',
  ];

  SAMPLE_QUESTIONS.forEach((question, index) => {
    lines.push(`${index + 1}. ${question.question}`);
    question.options.forEach((option, optionIndex) => {
      lines.push(`${L[optionIndex]}) ${option}`);
    });
    if (question.explanation && question.correctAnswerIndex >= 0) {
      lines.push(`Explanation: ${question.explanation}`);
    }
    lines.push('');
  });

  lines.push('## Answer Key', '');
  SAMPLE_QUESTIONS.forEach((question, index) => {
    // "—" marks a question that deliberately has no key.
    const letter =
      question.correctAnswerIndex >= 0 ? L[question.correctAnswerIndex] : '—';
    lines.push(`${index + 1}. ${letter}`);
  });
  lines.push('');

  return lines.join('\n');
}

export function buildSampleText(): string {
  const lines: string[] = [
    'Sample Practice Exam',
    `Subject: ${META.subject}    Grade: ${META.grade}`,
    `Time allowed: ${Math.round(META.timeLimit / 60)} minutes`,
    'Instructions: Choose the best answer for each question. Circle the letter.',
    '',
  ];

  SAMPLE_QUESTIONS.forEach((question, index) => {
    lines.push(`${index + 1}. ${question.question}`);
    question.options.forEach((option, optionIndex) => {
      lines.push(`${L[optionIndex]}. ${option}`);
    });
    lines.push('');
  });

  lines.push('Answer Key');
  SAMPLE_QUESTIONS.forEach((question, index) => {
    lines.push(`${index + 1}. ${question.correctAnswerIndex >= 0 ? L[question.correctAnswerIndex] : '—'}`);
  });
  lines.push('');
  return lines.join('\n');
}

export function buildSampleCsv(): string {
  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const rows = [
    'question,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation',
    ...SAMPLE_QUESTIONS.map((question) => {
      const options = [...question.options];
      while (options.length < 5) options.push('');
      const answer = question.correctAnswerIndex >= 0 ? L[question.correctAnswerIndex] : '';
      return [question.question, ...options, answer, question.explanation].map(escape).join(',');
    }),
  ];

  return rows.join('\n');
}

export interface SampleFile {
  filename: string;
  content: string;
  mime: string;
}

/** The downloadable sample for a format. PDF/photo return printable source. */
export function buildSampleFile(format: SampleFormat): SampleFile {
  switch (format) {
    case 'json':
      return { filename: 'sample-exam.json', content: buildSampleJson(), mime: 'application/json' };
    case 'markdown':
      return { filename: 'sample-exam.md', content: buildSampleMarkdown(), mime: 'text/markdown' };
    case 'csv':
      return { filename: 'sample-exam.csv', content: buildSampleCsv(), mime: 'text/csv' };
    case 'text':
      return { filename: 'sample-exam.txt', content: buildSampleText(), mime: 'text/plain' };
    case 'pdf':
    case 'image':
    default:
      // A PDF/photo cannot be generated in the browser; give the printable
      // source the student can export to PDF or photograph.
      return {
        filename: 'sample-exam-printable.md',
        content: buildSampleMarkdown(),
        mime: 'text/markdown',
      };
  }
}

/* -------------------------------------------------------------------------- */
/* AI prompt                                                                  */
/* -------------------------------------------------------------------------- */

const SHAPE_BY_FORMAT: Record<SampleFormat, string> = {
  json: `Return ONE JSON object, and nothing else:
{
  "schemaVersion": 1,
  "title": "…",
  "subject": "…",
  "grade": "…",
  "timeLimit": 1800,
  "questions": [
    { "id": "q1", "question": "…", "options": ["…", "…", "…", "…"], "correctAnswerIndex": 0, "explanation": "…" }
  ]
}
"correctAnswerIndex" is zero-based (0 = first option). "timeLimit" is in SECONDS.`,
  markdown: `Return ONE Markdown document in exactly this layout:

# <Exam title>

Subject: <subject>
Grade: <grade>
Time limit: <n> minutes

1. <question>
A) <option>
B) <option>
C) <option>
D) <option>
Explanation: <why>

2. <question>
…

## Answer Key

1. B
2. C

Options are lettered "A)" … "D)", one per line. The key is a single trailing section headed
exactly "## Answer Key", one "n. <letter>" line per question, in question order.`,
  csv: `Return ONE CSV file whose first line is exactly:

question,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation

One row per question. "correct_answer" is a single letter (A-E). Leave option_e empty when a
question has four options. Quote any field containing a comma, quote or newline, and use a
plain comma-separated UTF-8 file with no blank lines and no numbering column.`,
  text: `Return ONE plain-text exam paper, laid out like a printed school test:

<Exam title>
Time allowed: <n> minutes
Instructions: Choose the best answer for each question. Circle the letter.

1. <question>
A. <option>
B. <option>
C. <option>
D. <option>

…

Answer Key
1. B
2. C

Use "A." style letters (period, not parenthesis), one question per block, no tables.`,
  pdf: `Return the content for a single-column PDF exam paper:
- A title block (title, subject, grade, time allowed, instructions).
- One question per block: number, stem, four lettered options "A." … "D.".
- No tables, no images, no page headers or footers, at most 2 pages.
- Finish with an "Answer Key" section listing "n. <letter>" per question.`,
  image: `Return the content for a clean printed exam sheet that can be photographed or scanned:
- High contrast, single column, one question per block, generous spacing.
- Number, stem, four lettered options "A." … "D." per question.
- No handwriting, no shadows, no page numbers, no logos.
- Finish with an "Answer Key" section.`,
};

const RULES = `Rules you must follow:
- Exactly one correct answer per question; never invent facts.
- Four options per question unless a style below says otherwise; no repeated option text.
- Every question that has a key must have a short explanation.
- Keep numbering continuous from 1.
- Output ONLY the file content inside a single code block — no introduction, no commentary,
  no "here is your exam", nothing outside the block.
- Subject must be one of: General, Math, Biology, English, Physics, Chemistry, Aptitude, SAT
  (or another single word the teacher names).
- Use LaTeX in $…$ for any formula, and plain Amharic text where asked; do not romanise it.`;

const EXAMPLES = `Include this spread of question styles so the file exercises every case the
app supports (adapt the content to the subject, keep the shapes):
1. A standard four-option question with a clear correct answer.
2. A calculation question whose stem and options use LaTeX, e.g.
   "A body accelerates at $2\\ \\text{m/s}^2$ from rest. What is its velocity after 5 s?"
   with options "$5\\ \\text{m/s}$", "$10\\ \\text{m/s}$", "$15\\ \\text{m/s}$", "$20\\ \\text{m/s}$".
3. One question written entirely in Amharic (question text and options).
4. One true/false question with exactly two options.
5. One question with five options (A-E).
6. One practice-only question that deliberately has NO answer key: where the format has an
   answer key section, write "—" for it, and where answers are inline, omit the answer line.`;

/**
 * The prompt to give an AI so its output imports cleanly into this app.
 * `format` selects the exact shape; the rules and the style spread are shared.
 */
export function buildAiPrompt(format: SampleFormat, topic = 'Cell biology and motion'): string {
  const shape = SHAPE_BY_FORMAT[format] ?? SHAPE_BY_FORMAT.json;

  return [
    'You are producing an exam file for an offline exam-simulator app that imports files on the device.',
    'Read the format, the rules and the examples, then output the file.',
    '',
    '## FORMAT',
    shape,
    '',
    '## RULES',
    RULES,
    '',
    '## QUESTION STYLES TO INCLUDE',
    EXAMPLES,
    '',
    '## TASK',
    `Write an exam on: ${topic}.`,
    'Use 10 questions, grade 9-12 level, with a mix of difficulty.',
    'Title it descriptively (for example "Grade 9 Biology — Cells and Motion").',
    'Set a realistic time limit.',
    '',
    '## WORKED EXAMPLE OF THE EXPECTED OUTPUT',
    '```',
    format === 'csv' ? buildSampleCsv().split('\n').slice(0, 4).join('\n') : '',
    format === 'csv' ? '```' : '',
    format !== 'csv' ? '```' : '',
    format !== 'csv'
      ? (format === 'json' ? buildSampleJson() : format === 'text' ? buildSampleText() : buildSampleMarkdown())
          .split('\n')
          .slice(0, format === 'json' ? 22 : 18)
          .join('\n')
      : '',
    format !== 'csv' ? '```' : '',
    '',
    'Now produce the full exam for the task above, following the format exactly.',
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}
