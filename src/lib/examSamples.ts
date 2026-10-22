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
    question: 'Choose the sentence that is punctuated correctly.',
    options: [
      'Although it rained, the match continued.',
      'Although it rained the match, continued.',
      'Although, it rained the match continued.',
      'Although it rained; the match, continued.',
    ],
    correctAnswerIndex: 0,
    explanation: 'A subordinate clause is followed by a comma when it comes first.',
  },
  {
    question: 'Water boils at 100 °C at standard atmospheric pressure.',
    options: ['True', 'False'],
    correctAnswerIndex: 0,
    explanation: 'At 1 atm the boiling point of water is 100 °C.',
  },
  {
    question: 'Which of these is a renewable source of energy?',
    options: ['Coal', 'Natural gas', 'Wind', 'Diesel'],
    correctAnswerIndex: 2,
    explanation: 'Wind is naturally replenished; the others are finite fuels.',
  },
  {
    question: 'የሚከተሉት መሠረታዊ መጠኖች የትኛው ነው?',
    options: ['ፍጥነት', 'ግዝፈት', 'ማጣደፍ', 'ኃይል'],
    correctAnswerIndex: 1,
    explanation: 'ግዝፈት (mass) መሠረታዊ መጠን ነው፤ ሌሎቹ ከመሠረታዊ መጠኖች የተገኙ ናቸው።',
  },
  {
    question: 'Practice-only item: state one function of the cell membrane in your own words.',
    options: ['It controls what enters and leaves the cell', 'It stores genetic material'],
    correctAnswerIndex: -1,
    explanation: 'This item is intentionally ungraded to show how missing keys are handled.',
  },
];

/**
 * The sample files are real, importable papers — a format demo rather than a
 * lesson, so they deliberately mix subjects (biology, physics, English,
 * chemistry/energy, Amharic) and land in the General folder.
 */
const META = {
  title: 'Sample Practice Exam',
  subject: 'General',
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
  text: `Return ONE plain-text exam paper, laid out like a printed test:

<Exam title>
Subject: <subject>
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

export interface AiPromptOptions {
  /** The topic the student typed. Left blank, the prompt asks them to fill it in. */
  topic?: string;
  /** The student's folder name ("Chemistry", "Civics", …). Never a fixed list. */
  subject?: string;
  grade?: string;
  questionCount?: number;
}

/**
 * The prompt handed to an AI so its output imports cleanly into this app.
 *
 * It is deliberately topic-neutral: nothing in it assumes biology, physics or
 * any one subject, and no sample question is copied in (a model shown science
 * content tends to return science content for a history request). The format
 * governs the shape, the subject guidance block tells the model how notation
 * and difficulty change between subjects, and the task is filled from what the
 * student chose.
 */
export function buildAiPrompt(format: SampleFormat, options: AiPromptOptions | string = {}): string {
  // Backwards-compatible: buildAiPrompt('json', 'The French Revolution').
  const settings: AiPromptOptions = typeof options === 'string' ? { topic: options } : options;
  const shape = SHAPE_BY_FORMAT[format] ?? SHAPE_BY_FORMAT.json;
  const topic = (settings.topic || '').trim();
  const subject = (settings.subject || '').trim();
  const grade = (settings.grade || '').trim();
  const count = settings.questionCount && settings.questionCount > 0 ? settings.questionCount : 10;

  const subjectLine = subject
    ? `- Use exactly "${subject}" as the subject, because that is the folder this paper belongs to.`
    : '- Use one clear subject name (for example "Chemistry", "Civics", "English") — not a sentence.';

  const rules = `Rules you must follow:
- Exactly one correct answer per question; never invent facts, dates, figures or quotations.
- Four options per question by default; two for true/false; five is allowed when the subject needs it.
  Never repeat option text inside one question.
- Every question that has a key also gets a short explanation of why the answer is right.
- Number the questions continuously from 1, in the order they should be answered.
- Write in the language of the topic. Amharic must be written in Ethiopic script, never romanised.
- Use LaTeX between $…$ for every formula, symbol, fraction, unit or chemical equation.
- ${subjectLine}
- Output ONLY the file content inside a single code block — no introduction, no commentary,
  no "here is your exam", nothing outside the block.`;

  const subjectGuidance = `Adapt the questions to the subject — do not force a style that does not fit it:
- Mathematics, Physics, Chemistry: real calculations with units and significant figures; show the
  working in the explanation; use LaTeX for every symbol.
- Biology, Geography, Civics, History: precise terminology, named processes, dates and places that
  really exist; avoid trick questions.
- English, Reading, Literature: include short passages, then attach the questions that belong to
  that passage; test grammar, vocabulary and inference rather than trivia.
- Business, Economics, Accounting: figures in a table-like stem, and answers that follow from them.
- If the topic is a full paper, mix difficulty: a few straightforward items, most at the level asked,
  and one or two that separate strong students.
- Use the student's own folder name as the subject, and a realistic exam time limit.`;

  const questionStyles = `Include this spread of shapes, adapted to the subject (adapt the content, keep the
shapes — they exercise every case the importer supports):
1. A standard four-option question with one clearly correct answer.
2. A question whose stem or options use LaTeX, only where the subject has notation
   (maths, science, economics). Otherwise use the equivalent "notation-heavy" item for that subject.
3. One question written entirely in Amharic (Ethiopic script), only if the exam is in Amharic
   or the topic is an Ethiopian subject; otherwise skip it.
4. One true/false question with exactly two options.
5. One question with five options (A-E).
6. One practice-only question that deliberately has NO answer key: where the format has an answer
   key section, write "—" for it, and where answers are inline, omit the answer line.`;

  const example = buildPromptExample(format);

  return [
    'You are producing an exam file for an offline exam-simulator app that imports files on the device.',
    'Read the format, the rules, the subject guidance and the example, then output the file.',
    '',
    '## FORMAT',
    shape,
    '',
    '## RULES',
    rules,
    '',
    '## ADAPT TO THE SUBJECT',
    subjectGuidance,
    '',
    '## QUESTION STYLES TO INCLUDE',
    questionStyles,
    '',
    '## TASK',
    topic
      ? `Write an exam on: ${topic}.`
      : 'Write an exam on the topic I give you in my next message. Until then, use "<my topic>" as the topic.',
    `Use ${count} questions${grade ? ` at ${grade} level` : ' at grade 9-12 level'}.`,
    `Title it descriptively${subject ? ` in the style "Grade 12 ${subject} — <topic>"` : ''}.`,
    'Set a realistic time limit for that length of exam.',
    '',
    '## WORKED EXAMPLE OF THE EXPECTED LAYOUT',
    'Placeholders are used on purpose: copy the SHAPE, replace the content with the topic.',
    '```',
    example,
    '```',
    '',
    'Now produce the full exam for the task above, following the format exactly.',
  ].join('\n');
}

/** A placeholder-only example, so no subject leaks into the request. */
export function buildPromptExample(format: SampleFormat): string {
  const q = (n: number) => [
    `${n}. <question ${n} stem>`,
    'A) <option A>',
    'B) <option B>',
    'C) <option C>',
    'D) <option D>',
  ].join('\n');

  switch (format) {
    case 'json':
      return [
        '{',
        '  "schemaVersion": 1,',
        '  "title": "<Grade N Subject — topic>",',
        '  "subject": "<subject>",',
        '  "grade": "<grade>",',
        '  "timeLimit": 1800,',
        '  "questions": [',
        '    { "id": "q1", "question": "<stem>", "options": ["<A>", "<B>", "<C>", "<D>"],',
        '      "correctAnswerIndex": 0, "explanation": "<why>" },',
        '    { "id": "q2", "question": "<stem>", "options": ["<A>", "<B>"],',
        '      "correctAnswerIndex": 1, "explanation": "<why>" }',
        '  ]',
        '}',
      ].join('\n');
    case 'csv':
      return [
        'question,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation',
        '"<question 1>","<A>","<B>","<C>","<D>",,B,"<why>"',
        '"<question 2>","<A>","<B>","<C>","<D>",,B,"<why>"',
      ].join('\n');
    case 'markdown':
      return [
        '# <Grade N Subject — topic>',
        '',
        'Subject: <subject>',
        'Grade: <grade>',
        'Time limit: <n> minutes',
        '',
        q(1),
        'Explanation: <why>',
        '',
        q(2),
        'Explanation: <why>',
        '',
        '## Answer Key',
        '',
        '1. B',
        '2. C',
      ].join('\n');
    case 'text':
    case 'pdf':
    case 'image':
    default:
      return [
        '<Exam title>',
        'Subject: <subject>    Grade: <grade>',
        'Time allowed: <n> minutes',
        '',
        q(1),
        '',
        q(2),
        '',
        'Answer Key',
        '1. B',
        '2. C',
      ].join('\n');
  }
}
