# Import test prompts

Copy-paste prompts for generating one test exam per import format, plus the exact
result each one should produce. Use them to exercise **every** way an exam can
enter the app.

There are two families of import, and they must be tested separately:

| Family | Formats | Where | Needs AI key? | Can invent a wrong answer? |
|---|---|---|---|---|
| **On-device (deterministic)** | `.json`, `.md` / `.markdown` | **My Exams → Upload New Exam → Import** tab | No | No — unreadable keys are left ungraded |
| **AI extraction** | `.csv`, `.txt`, `.pdf`, images | **Upload File** tab, or **Paste Text** tab | Yes (`GEMINI_API_KEY`) | It can misread, so always check the preview |

Where to start: **My Exams → Upload New Exam** (or the upload button on the Home
dashboard). The three tabs are **Upload File (PDF / MD / TXT)**, **Paste Text /
Markdown**, and **Import**. Also worth testing once: the upload area on the
landing page while signed out, which uses the same handlers.

Always set **Subject** and **Grade** in the modal before importing. The file's own
`Subject:` / `Grade:` values win when present; the dropdowns are the fallback.

---

## 0. Shared spec — prepend to any prompt

Paste this **before** the format-specific prompt so your agent produces something
the app actually accepts:

```
You are generating a practice exam file for an offline exam-simulator app.

Hard rules:
- Exactly one correct answer per question, except where I ask for an ungraded
  question on purpose.
- 4 options per question (A-D) unless I say otherwise; no duplicate option text.
- Never invent facts: every question must be answerable from standard Grade 9-12
  curriculum content, and the answer key must be correct.
- Subject must be exactly one of: General, Math, Biology, English, Physics,
  Chemistry, Aptitude, SAT.
- Grade must be exactly one of: Grade 9, Grade 10, Grade 11, Grade 12, General.
- Include an explanation for every question that has an answer key.
- Output ONLY the file content inside a single code block. No introduction, no
  summary, no "here is your file".
- Do not wrap the content in extra prose inside the code block.
```

---

## 1. JSON — deterministic import (recommended first test)

**Save the output as** `biology-cells.json`
**Then:** My Exams → Upload New Exam → **Import** tab → drag the file in → check the preview → **Add imported exam**.

```
Using the shared spec, generate a JSON exam file.

Schema (exact field names):
{
  "schemaVersion": 1,
  "title": "Grade 9 Biology — Cells and Transport",
  "subject": "Biology",
  "grade": "Grade 9",
  "timeLimit": 1200,
  "questions": [
    {
      "id": "q1",
      "question": "Which organelle is the site of aerobic respiration?",
      "options": ["Ribosome", "Mitochondrion", "Golgi apparatus", "Lysosome"],
      "correctAnswerIndex": 1,
      "explanation": "Mitochondria generate ATP by oxidative phosphorylation."
    }
  ]
}

Rules specific to this file:
- 10 questions on cell structure, transport across membranes, and enzymes.
- "correctAnswerIndex" is ZERO-BASED: 0 = first option, 1 = second, etc.
- Use "correctAnswerIndex" for questions 1-7 and the letter form
  "correctAnswer": "B" for questions 8-10, so I can verify both notations work.
- timeLimit is in SECONDS.
- Question 10 must be a two-option True/False question.
- Valid JSON only: double quotes, no trailing commas, no comments, no ``` fence
  inside the block.
```

**Expected result:** preview reads **10 of 10 questions**, all graded, no issues,
time limit shown as **20 min**, title prefilled from the file.

---

## 2. Markdown — deterministic import

**Save the output as** `biology-cells.md`
**Then:** same **Import** tab.

```
Using the shared spec, generate a Markdown exam file in EXACTLY this layout:

# Grade 9 Biology — Cells and Transport

Subject: Biology
Grade: Grade 9
Time limit: 20 minutes

1. Which organelle is the site of aerobic respiration?
A) Ribosome
B) Mitochondrion
C) Golgi apparatus
D) Lysosome

2. A red blood cell placed in distilled water will most likely
A) shrink
B) swell and burst
C) stay unchanged
D) dissolve its nucleus

## Answer Key

1. B
2. B

Rules specific to this file:
- 10 questions, same topics as before.
- Options are lettered "A)" through "D)" on their own lines, one per line.
- The answer key goes in ONE trailing section headed exactly "## Answer Key",
  written as "1. B" per line, in question order.
- Do NOT put "Answer:" lines inside the questions — this file tests the
  trailing answer-key format only.
- Leave one blank line between questions.
```

**Expected result:** **10 of 10 questions**, all graded, no issues.

Variants worth repeating (both are supported):
- Put `Answer: B` directly under each question's options and drop the trailing
  key — ask the agent for that instead.
- Ask for `**1.**` bold question numbers and `**A)**` bold options (formatting
  from chat apps); the parsers handle both.

---

## 3. CSV — AI extraction path

**Save the output as** `biology-cells.csv`
**Then:** **Upload File** tab → choose the file → the AI extracts it.

```
Using the shared spec, generate a CSV exam file with this exact header row:

question,option_a,option_b,option_c,option_d,correct_answer,explanation

Rules specific to this file:
- 8 questions on cell structure and membrane transport.
- correct_answer holds a single letter: A, B, C or D.
- Quote every field that contains a comma, quote or newline.
- No blank lines, no numbering column.
- Plain CSV only (comma separated, UTF-8, no BOM).
```

**Expected result:** the AI path returns 8 questions in the preview with a
sensible key. Compare the key against the file by eye — this path is the one
that can misread, which is the point of testing it.

> Requires `GEMINI_API_KEY` on the server. Without it the app answers
> `503 AI_NOT_CONFIGURED` and the dialog says AI is not configured.

---

## 4. Plain text — AI extraction path (or Paste tab)

**Save the output as** `biology-cells.txt`, **or** paste the code-block contents
straight into the **Paste Text** tab and press **Generate with AI**.

```
Using the shared spec, generate a plain-text exam paper that looks like a
printed school test:

Grade 9 Biology Practice Test - Cells and Transport
Time allowed: 20 minutes
Instructions: Choose the best answer for each question. Circle the letter.

1. Which organelle is the site of aerobic respiration?
A. Ribosome
B. Mitochondrion
C. Golgi apparatus
D. Lysosome
Answer: B

...continue for 8 questions...

Answer Key
1. B
2. ...

Rules specific to this file:
- 8 questions, "A." style options with periods (not parentheses).
- Include the instruction line and the time allowed line.
- No tables, no columns, no page numbers.
```

**Expected result:** 8 questions from the AI path. This is the format most
likely to reveal layout weaknesses, which is why it's worth running.

---

## 5. PDF — AI extraction path

Ask your agent to produce the same content as prompt 4, then **export/print it to
PDF** (or have the agent emit a PDF if it can). Constraints that matter:

```
Using the shared spec, write the exam for PDF export:
- Single column, one question per block, no tables, no images.
- Every question: number, stem, four lettered options, "Answer: X" line.
- Keep it to 2 pages maximum, 10-12pt body text.
- Avoid headers/footers/page numbers.
```

**Then:** **Upload File** tab → pick the `.pdf`.
**Expected result:** questions extracted with the key intact. A scanned or
handwritten PDF is the hardest case — expect fewer questions and check each one.

---

## 6. Edge-case drill — deterministic, exercises the safety rules

**Save as** `edge-cases.md`. This file is designed to produce **defined** warnings
rather than to be a good exam.

```
Using the shared spec, generate a Markdown exam named "Edge Case Drill" with
subject Physics, grade Grade 11, time limit 45 minutes, and exactly these 5
questions in this order:

1. A body accelerates at $2\ \text{m/s}^2$ from rest. What is its velocity after
   5 s? Options $5\ \text{m/s}$, $10\ \text{m/s}$, $15\ \text{m/s}$,
   $20\ \text{m/s}$. Answer: B, with a LaTeX explanation.
2. A question written in Amharic about base quantities, four Amharic options,
   Answer: B.
3. A question with FOUR options and NO answer key at all, and no entry for it in
   the trailing answer key.
4. A question whose options A and B are the same text ("same text"), C "other",
   D "different", Answer: C.
5. A question with FIVE options A-E, Answer: E.

End with a "## Answer Key" section listing only questions 1, 2, 4 and 5.
Use LaTeX for the formulas in question 1.
```

**Expected result (verified against the parser):**

| Check | Expected |
|---|---|
| Questions imported | 5 accepted, 0 rejected |
| Graded / ungraded | 4 graded, 1 ungraded |
| Q3 | `correctAnswerIndex = -1`, warning *"No answer key for this question — it will be imported but never scored."* |
| Q4 | duplicate option collapsed to 3 options |
| Q5 | 5 options kept, answer E |
| Formulas | Q1 renders with KaTeX in the exam view |
| Amharic | Q2 renders right-to-left-safe Amharic text |

Then **take the exam** and finish it: Q3 must be shown as neutral/ungraded in the
review, never as a wrong answer, and the score must be out of 4, not 5.

---

## 7. Export round-trip — the other half of the feature

After importing any of the above:

1. Go to **Home** or a subject folder, open the exam card's **download** menu.
2. Export **JSON** → re-import it → the preview must show the same question count,
   the same key, and the same time limit.
3. Export **Markdown** → re-import it → same question count and key.
   (Markdown is intentionally lossy: `section` / `instruction` / `context` are
   flattened, passages are merged into the stem. JSON is the lossless format.)

`npm test` already covers both round-trips; repeating them in the browser checks
the file download, filename and picker wiring.

---

## What each test proves

| Test | What breaks if it fails |
|---|---|
| JSON import | The canonical format, answer resolution (index + letter), preview |
| Markdown import | The heuristic parser, answer-key section, heading/bold handling |
| CSV / TXT / PDF | The server AI path, key handling, error copy (503/502/422) |
| Paste tab | The same AI path without a file read |
| Edge cases | Ungraded handling, duplicate options, 5-option support, LaTeX, Amharic |
| Export | Blob download, filename slugging, re-importability |

## If something goes wrong

| Message you see | Meaning |
|---|---|
| `This file is not valid JSON: …` | The agent added prose or a broken fence around the JSON — keep only the code block |
| `No "questions" array was found` | Wrong shape; the file must be an object with a `questions` array |
| `Only N non-empty option(s); at least 2 are required` | That question is skipped; the rest still import |
| `No answer key for this question — it will be imported but never scored` | Working as designed; the app never guesses an answer |
| `503 AI_NOT_CONFIGURED` | `GEMINI_API_KEY` missing on the server |
| `502 AI_KEY_REJECTED` / `AI_ACCESS_DENIED` | Key invalid or not allowed for the model |
| `503 isBusy` | Rate limit / concurrency; retry, or use the deterministic JSON/MD path |
