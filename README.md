# Ethiopian University Entrance Examination (EUEE) & National Exam Prep Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-brightgreen.svg)]()
[![Free Tier Ready](https://img.shields.io/badge/Status-Production%20Ready-blue.svg)]()

> A modern, free, and open-source exam preparation platform. Turns your own documents, textbook chapters and study materials into interactive, timed and graded practice simulations.

---

## 📖 About the Platform

The **EUEE & National Exam Prep Platform** is designed to empower Ethiopian students and lifelong learners with accessible, high-quality digital exam preparation tools. Whether practicing for the Grade 12 ESSLCE / EUEE national matriculation exams (Natural and Social Sciences) or creating custom practice tests from lecture notes, the platform provides an authentic examination environment complete with instant grading, step-by-step explanations, multilingual support, and offline resilience.

---

## ✨ Key Features & Capabilities

- 📚 **Your Own Exam Bank**: Bring your own PDFs, notes, question banks or past papers — the app turns them into a structured, searchable library organised by subject and grade.
- ⚡ **AI-Powered Exam Generation**: Upload exam PDFs, document scans, or paste raw syllabus text to automatically generate structured multiple-choice questions with answer keys and explanations via Google Gemini.
- ⏱️ **Real-Time Exam Simulation**: Authentic exam interface featuring customizable countdown timers, question bookmarks, navigation palettes, and instant score breakdowns.
- 📊 **Performance Analytics & History**: Detailed session review screens highlighting correct answers, explanations, question-by-question timing, and persistent progress metrics.
- 🌐 **Multilingual Interface**: Full internationalization supporting **English** and **Amharic (አማርኛ)**.
- 📴 **Offline-First Resilience**: Full IndexedDB offline storage for taking exams, saving sessions, and studying even with intermittent or no internet connection.
- 📐 **LaTeX & Scientific Formula Rendering**: Integrated KaTeX engine for sharp mathematical formulas, chemical equations, and scientific notations.
- 🔒 **Enterprise-Grade Security**: Secured with Firestore security rules, Helmet HTTP headers, IP rate-limiting, and server-side secret management.

---

## 🚀 How to Use the App

1. **Getting Started**:
   - On initial launch, choose your preferred language (**English** or **Amharic**) and theme (Dark/Light).
   - Sign in using your email and password, or click **"Continue as Guest"** for instant anonymous access.

2. **Selecting or Creating an Exam**:
   - Upload a PDF or paste text to create your first practice exam, then organise it by subject and grade.
   - Or upload your own PDF / image / Markdown / JSON file to build a custom exam. Structured files are read on-device; the AI extractor is optional.

3. **Taking the Exam**:
   - Select your answers, flag questions for review, and monitor your remaining time.
   - Submit your answers when ready or let the auto-submit feature trigger when time expires.

4. **Reviewing Results**:
   - View your total score, percentage, time spent, and detailed explanations for every question.
   - Access the **Dashboard** to review your past attempts and track your mastery over time.

---

## 💻 Tech Stack & Architecture

- **Frontend**:
  - **Framework**: React 19 + TypeScript + Vite
  - **Styling**: Tailwind CSS with responsive layout and dark/light mode themes
  - **Animations**: Framer Motion (`motion/react`)
  - **Math & Science Rendering**: KaTeX, `remark-math`, `rehype-katex`
  - **Icons**: Lucide React
  - **Client Persistence**: IndexedDB & LocalStorage via custom offline synchronization engine

- **Backend & APIs**:
  - **Runtime**: Node.js + Express
  - **Security & Middlewares**: Helmet HTTP security headers, CORS, Express Rate Limit (`express-rate-limit`)
  - **AI Engine**: Google Gemini API via `@google/genai` TypeScript SDK
  - **Bundling & Build**: Vite + esbuild (production Node CommonJS bundle)

- **Database & Authentication**:
  - **Cloud Database**: Google Cloud Firestore (provisioned with strict per-user security rules)
  - **Authentication**: Firebase Authentication — Google sign-in, Email/Password, and guest sessions

---

## 🔐 Enabling Google Sign-In

The app is wired to the Firebase project **`gen-lang-client-0826296814`**
(configured in `firebase-applet-config.json`; `VITE_FIREBASE_*` env vars
override it). It uses the project's **default** Firestore database, so no
named database is required.

The app ships the Google button and the whole flow, but sign-in only works once
the Firebase project allows it:

0. **Firestore Database → Create database** → Standard edition → pick a region →
   production mode. Then **Firestore → Rules**, paste `firestore.rules`,
   **Publish**. Without a database, auth still works but nothing is saved to the
   cloud (the app falls back to on-device storage).

1. Firebase console → **Authentication** → **Sign-in method** → enable **Google**
   (set the public-facing project name and support email).
2. **Authentication** → **Settings** → **Authorized domains**: add every domain
   the app is served from (`localhost` is present by default, the
   `*.firebaseapp.com` domain too). `vercel.app` preview domains must be added
   explicitly, otherwise Google returns `auth/unauthorized-domain`.
3. No secrets are involved: the web config in `firebase-applet-config.json` is
   public (it ships in the browser bundle), so it is safe to commit. Never put
   `VITE_FIREBASE_*` values that belong to a different project than the one
   holding your Firestore rules.

How it behaves:

- Desktop/Android: `signInWithPopup` (with `prompt=select_account`, so the
  student always picks an account).
- Installed PWA (standalone display mode): `signInWithRedirect`, because a
  popup has no reliable return path there. The result is collected by
  `getRedirectResult` on the next load.
- Popup blocked outside an iframe: falls back to the redirect flow silently.
- Inside an iframe preview (where popups are blocked and a redirect would be
  refused by Google): an explicit "open in a new tab" message instead of a
  dead end.
- Closing the Google window is treated as "no action", not as an error.
- Firestore rules are uid-based, so a Google account uses exactly the same
  per-user rules as an email account — no rules change is needed.
- Exams created in guest mode are moved into the Google account by the existing
  guest-sync effect on first sign-in.

---

## 📥 Getting Exams Into the App

There are three ways in, in order of cost and reliability. Only the last one
needs an API key.

### 1. JSON import — exact, offline, free

The canonical format is versioned and documented in
`src/lib/examSchema.ts`. The upload dialog can download a template; a minimal
file looks like this:

```json
{
  "schemaVersion": 1,
  "title": "Physics — Unit 3",
  "subject": "Physics",
  "grade": "Grade 12",
  "timeLimit": 3600,
  "questions": [
    {
      "id": "q1",
      "question": "What is the SI unit of force?",
      "options": ["Joule", "Newton", "Watt", "Pascal"],
      "correctAnswerIndex": 1,
      "explanation": "1 N = 1 kg·m/s²."
    }
  ]
}
```

The importer is deliberately lenient about *shape* and strict about *facts*:

- `options` may be an array of strings, an array of `{ text }` objects (with
  `isCorrect: true` supported), or an `{ "A": "…", "B": "…" }` map.
- The answer may be `correctAnswerIndex` (0-based), `correctAnswer` as a letter,
  a 1-based number, or the full option text. A top-level
  `answerKey: { "1": "B" }` map also works.
- **A missing answer key is never guessed.** Such questions are imported as
  *ungraded*: you can still practise them, but they are not scored, and the
  results screen says so.
- A preview shows exactly what will be added — counts, rejected questions and
  every warning (duplicate options, repeated stems, out-of-range answers) —
  before anything is saved.

Every exam can be exported back to the same JSON (or Markdown) from its card
menu, so a library is portable and never locked to one browser.

### 2. Markdown import — offline, free

Ask any AI (or write it by hand) for:

```
1. What is the powerhouse of the cell?
A) Nucleus
B) Mitochondria
C) Ribosome
D) Chloroplast

## Answer Key
1. B
```

`## Answer Key` (also "Answers:", "Answer Key: 1. B 2. C", "1-B") is optional;
without it the exam opens in practice mode. Optional header lines
`Subject:`, `Grade:` and `Time limit: 60 minutes` are read too.

### 3. AI extraction — needs `GEMINI_API_KEY`

For PDFs, photos of papers, or messy text with no answer key. The server sends
the document to Gemini and validates the returned JSON. Without a key the
endpoint answers `503 AI_NOT_CONFIGURED`, and the app never falls back to
made-up questions.

---

## 🛠️ Running the Project Locally

```bash
npm install          # Node.js 20+ required
npm run dev          # Express + Vite dev server on http://localhost:3000
npm run typecheck    # tsc --noEmit
npm test             # unit tests for scoring, timers, parsing and subjects
npm run build        # production client (dist/) + server bundle (dist/server.cjs)
npm start            # run the production bundle
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port (default `3000`). |
| `GEMINI_API_KEY` | Enables AI exam extraction (optional — JSON/Markdown import works without it). Never prefix with `VITE_`. |
| `CORS_ORIGIN` | Comma-separated list of allowed browser origins for `/api/*`. When unset, no cross-origin browser requests are allowed. |
| `VITE_FIREBASE_*` | Firebase project settings (falls back to `firebase-applet-config.json`). |

Deployment: `vercel.json` builds the SPA with `npm run build:client` and serves `api/*` as serverless functions. The API keys stay server-side only.

---

## 📜 License & Open Source

This project is **100% Free and Open Source** under the **MIT License**. You are free to use, modify, distribute, and contribute to this codebase.

---

