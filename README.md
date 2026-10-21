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
- 🌐 **Multilingual Interface**: Full internationalization supporting **English**, **Amharic (አማርኛ)**, **Afaan Oromoo**, and **Tigrinya (ትግርኛ)**.
- 📴 **Offline-First Resilience**: Full IndexedDB offline storage for taking exams, saving sessions, and studying even with intermittent or no internet connection.
- 📐 **LaTeX & Scientific Formula Rendering**: Integrated KaTeX engine for sharp mathematical formulas, chemical equations, and scientific notations.
- 🔒 **Enterprise-Grade Security**: Secured with Firestore security rules, Helmet HTTP headers, IP rate-limiting, and server-side secret management.

---

## 🚀 How to Use the App

1. **Getting Started**:
   - On initial launch, choose your preferred language (**English**, **Amharic**, **Afaan Oromoo**, or **Tigrinya**) and theme (Dark/Light).
   - Sign in using your email and password, or click **"Continue as Guest"** for instant anonymous access.

2. **Selecting or Creating an Exam**:
   - Upload a PDF or paste text to create your first practice exam, then organise it by subject and grade.
   - Or upload your own PDF / text notes on the home screen to let the AI create a custom practice exam.

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
  - **Authentication**: Firebase Authentication (Email/Password & Anonymous Guest sessions)

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
| `GEMINI_API_KEY` | Enables AI exam generation. Without it `/api/generate-exam` returns `503 AI_NOT_CONFIGURED` and the UI offers the on-device parser instead. |
| `CORS_ORIGIN` | Comma-separated list of allowed browser origins for `/api/*`. When unset, no cross-origin browser requests are allowed. |
| `VITE_FIREBASE_*` | Firebase project settings (falls back to `firebase-applet-config.json`). |

Deployment: `vercel.json` builds the SPA with `npm run build:client` and serves `api/*` as serverless functions. The API keys stay server-side only.

---

## 📜 License & Open Source

This project is **100% Free and Open Source** under the **MIT License**. You are free to use, modify, distribute, and contribute to this codebase.

---

## 👨‍💻 Creator & Attribution

Developed with passion by **Mr. Tewodros Abebe** using **Google AI Studio**.
