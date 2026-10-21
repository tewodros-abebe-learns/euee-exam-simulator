import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { parseExamHeuristicallyDetailed } from "../lib/heuristicExamParser";
import { normalizeExamData } from "../lib/examNormalizer";

// ==========================================
// Security: In-Memory Sliding Window Rate Limiter
// ==========================================
interface RateLimitRecord {
  timestamps: number[];
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;

const MAX_TRACKED_IPS = 5000;

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { timestamps: [] };
  // Filter out timestamps outside window
  record.timestamps = record.timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }

  record.timestamps.push(now);
  rateLimitMap.set(ip, record);

  // Opportunistic eviction: drop entries with no activity left in the window
  // so a long-running container cannot leak memory through the map.
  if (rateLimitMap.size > MAX_TRACKED_IPS) {
    rateLimitMap.forEach((value, key) => {
      if (!value.timestamps.some(ts => now - ts < RATE_LIMIT_WINDOW_MS)) {
        rateLimitMap.delete(key);
      }
    });
  }
  return true;
}

// ==========================================
// System Optimization: In-Memory SHA-256 Cache
// ==========================================
interface CachedExam {
  data: any;
  createdAt: number;
}
const examCache = new Map<string, CachedExam>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_CACHE_ENTRIES = 100;

export function getCachedExam(hash: string): any | null {
  const entry = examCache.get(hash);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    examCache.delete(hash);
    return null;
  }
  return entry.data;
}

export function setCachedExam(hash: string, data: any) {
  if (examCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = examCache.keys().next().value;
    if (oldestKey) examCache.delete(oldestKey);
  }
  examCache.set(hash, { data, createdAt: Date.now() });
}

export interface ExamRequestBody {
  rawText?: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
}

/**
 * Builds a response from the deterministic parser, but only when the parser is
 * confident that it read real options and a real answer key. Questions without
 * a detectable key are dropped so nothing is ever graded against a guess.
 */
function buildLocalFallback(trimmedText: string, fileName?: string): any | null {
  if (!trimmedText || trimmedText.trim().length < 40) return null;
  const parsed = parseExamHeuristicallyDetailed(trimmedText, fileName || "Uploaded Exam Practice");
  if (!parsed.data || parsed.confidence !== 'high' || parsed.data.questions.length === 0) return null;
  return {
    ...parsed.data,
    source: 'heuristic',
    warning: "Extracted on-device because the AI service was unavailable. Please double-check the questions and answers."
  };
}

export async function processExamGeneration(body: ExamRequestBody, clientIp: string = 'unknown'): Promise<{ status: number; data: any }> {
  // 1. Rate Limiting Check
  if (!checkRateLimit(clientIp)) {
    return {
      status: 429,
      data: { error: "Rate limit exceeded. Please wait a moment before uploading or processing another exam." }
    };
  }

  // 2. Input Validation & Sanitization
  const { rawText, fileBase64, mimeType, fileName } = body;
  const hasText = rawText && typeof rawText === 'string' && rawText.trim().length > 0;
  const hasFile = fileBase64 && typeof fileBase64 === 'string' && fileBase64.trim().length > 0;

  if (!hasText && !hasFile) {
    return {
      status: 400,
      data: { error: "No document text or file content provided to generate exam from." }
    };
  }

  const trimmedText = hasText ? rawText.trim() : "";
  const MAX_TEXT_LENGTH = 1000000; // 1MB text limit
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return {
      status: 400,
      data: { 
        error: `Document text exceeds maximum size limit (${Math.round(trimmedText.length / 1000)}KB / ${Math.round(MAX_TEXT_LENGTH / 1000)}KB). Please upload a smaller section.` 
      }
    };
  }

  // Base64 inflates payloads by ~33%, so 20MB of base64 is ~15MB of file.
  const MAX_BASE64_LENGTH = 20 * 1024 * 1024;
  if (hasFile && fileBase64.length > MAX_BASE64_LENGTH) {
    return {
      status: 400,
      data: {
        error: "File upload size exceeds the 15MB limit. Please compress or split the document."
      }
    };
  }

  // 3. Check Cache — the key covers the whole payload so two different
  // documents can never collide just because they share a length/prefix.
  const textHash = crypto
    .createHash('sha256')
    .update(trimmedText)
    .update('\u0000')
    .update(hasFile ? fileBase64 : '')
    .digest('hex');
  const cached = getCachedExam(textHash);
  if (cached) {
    return { status: 200, data: cached };
  }

  // 4. API Key Verification
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    // Never fabricate a replacement exam here: an unconfigured server is a
    // deployment problem that the operator must see, not a silent fake quiz.
    return {
      status: 503,
      data: {
        error: "AI exam generation is not configured on this server. Ask the administrator to set GEMINI_API_KEY.",
        code: "AI_NOT_CONFIGURED"
      }
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: 90000,
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Ordered from cheapest/fastest to strongest. `gemini-3.1-flash-lite` has
  // the smallest output budget, so it is kept last.
  const CANDIDATE_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite"
  ];

  // Prepare multimodal content parts
  const multimodalParts: any[] = [];

  if (hasFile) {
    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
    let detectedMime = mimeType || 'application/pdf';
    if (fileName) {
      const lower = fileName.toLowerCase();
      if (lower.endsWith('.pdf')) detectedMime = 'application/pdf';
      else if (lower.endsWith('.png')) detectedMime = 'image/png';
      else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) detectedMime = 'image/jpeg';
      else if (lower.endsWith('.webp')) detectedMime = 'image/webp';
    }
    multimodalParts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: detectedMime
      }
    });
  }

  const promptInstructions = `You are a master educational exam extractor and parser.
Analyze this uploaded document/exam booklet thoroughly and extract ALL multiple-choice questions into a structured format.

MANDATORY RULES:
1. COMPLETE EXTRACTION OF ALL QUESTIONS (PRIMARY RULE):
   - If this is an exam booklet, past national exam paper (e.g. Ethiopian ESSLCE, SAT, GCSE, AP, etc.), practice test, or question bank with numbered questions (e.g. 20, 40, 50, 60, 100 questions):
     YOU MUST EXTRACT AND RETURN EVERY SINGLE NUMBERED QUESTION FROM QUESTION 1 TO THE FINAL QUESTION (e.g., all 60 questions for a 60-item exam).
     NEVER truncate, omit questions, or stop after only 5 or 10 questions.
2. MULTI-PAGE & SCANNED EXAM BOOKLETS:
   - The booklet may have question problems on earlier pages and answer keys with step-by-step explanations on later pages.
   - For every question (e.g. Q1 through Q60), combine the question problem, its 4 options (A, B, C, D), identify the correct answer index (0 for A, 1 for B, 2 for C, 3 for D), and attach the comprehensive explanation.
3. PRESERVE & TRANSCRIBE VISUALS, DIAGRAMS, CHARTS & TABLES:
   - For questions referencing graphs, histograms, frequency tables, coordinate planes, geometric figures, or vector diagrams, transcribe all vital values, coordinates, frequencies, and figure details into the 'context' or 'question' field so the question is completely clear and solvable.
4. MATHEMATICAL AND SCIENTIFIC NOTATION:
   - Format all mathematical equations, formulas, fractions, radicals, powers, and matrices cleanly using LaTeX notation enclosed in $...$ (e.g. $f(x) = x^3 - 3x^2 + 3$, $\\sqrt{29}$, $\\frac{2x-3}{x^2+x-2}$, $\\vec{AB} + \\vec{BC}$, etc.).
5. ACCURATE 4-OPTION STRUCTURE:
   - Every question must have 4 distinct choices in the 'options' array.
   - Set 'correctAnswerIndex' to the 0-based index of the correct option.
6. OUTPUT LENGTH AWARENESS:
   - To avoid JSON truncation, keep explanations concise.

7. UNSTRUCTURED STUDY NOTES / CHAPTERS:
   - If the material consists of study notes or textbook chapters instead of explicit exam questions, generate a comprehensive quiz covering ALL major topics, theorems, and concepts across the entire document (scaling up with document length, e.g., 20 to 50 questions for large documents).

${trimmedText ? `Extracted Text Content:\n${trimmedText}` : ''}
`;

  multimodalParts.push({ text: promptInstructions });
  const textOnlyParts = [{ text: promptInstructions }];

  const config = {
    systemInstruction: `You are a world-class educational exam parser, structured data extraction specialist, and quiz generator.
Your mission is to extract ALL multiple-choice questions from the provided document accurately, completely, and robustly.
If the document is a 60-question or 100-question exam, you MUST extract ALL 60 or 100 questions without omitting any.
You MUST preserve all section headings, instructions, and reading comprehension passages.
Format all mathematical expressions in LaTeX ($...$).
Return a strictly valid JSON object matching the schema with a "title" and a "questions" array containing ALL extracted questions.`,
    responseMimeType: "application/json",
    // A 100-question paper with explanations needs far more than 16k tokens;
    // the old limit silently truncated long exams mid-JSON.
    maxOutputTokens: 32768,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              section: { type: Type.STRING },
              instruction: { type: Type.STRING },
              passage: { type: Type.STRING },
              context: { type: Type.STRING },
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["id", "question", "options", "correctAnswerIndex", "explanation"]
          }
        }
      },
      required: ["title", "questions"]
    }
  };

  let responseText: string | undefined;
  let lastError: any;

  // Strategy: First try multimodal (with file), if that encounters 503/429 spikes, fallback to text-only payload
  const payloadsToTry = [
    { name: "multimodal", parts: hasFile ? multimodalParts : textOnlyParts },
    ...(hasFile && trimmedText.length > 30 ? [{ name: "text-only-fallback", parts: textOnlyParts }] : [])
  ];

  modelSearchLoop:
  for (const payload of payloadsToTry) {
    for (const modelName of CANDIDATE_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: payload.parts,
            config
          });
          if (response?.text) {
            responseText = response.text;
            break modelSearchLoop;
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);

          // If model quota is 0 or unauthorized, do not retry same model
          if (errMsg.includes("limit: 0") || errMsg.includes("403") || errMsg.includes("404") || errMsg.includes("NOT_FOUND")) {
            break;
          }

          // Exponential backoff with jitter on 503 (Unavailable) or 429 (Rate Limit)
          if (attempt === 1 && (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED"))) {
            const backoffMs = 1200 + Math.floor(Math.random() * 800);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }
    }
  }

  if (!responseText) {
    const local = buildLocalFallback(trimmedText, fileName);
    if (local) {
      setCachedExam(textHash, local);
      return { status: 200, data: local };
    }
    return {
      status: 503,
      data: {
        error: "AI exam extraction is temporarily busy. Please try again in a few minutes.",
        isBusy: true,
        details: lastError?.message || "Candidate models are currently busy."
      }
    };
  }

  let jsonStr = responseText.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
  }

  // Attempt extraction from embedded JSON substring if model enclosed extra narrative
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }
  
  try {
    const rawData = JSON.parse(jsonStr);
    const parsedData = normalizeExamData(rawData);
    if (parsedData.questions && parsedData.questions.length > 0) {
      setCachedExam(textHash, parsedData);
      return { status: 200, data: parsedData };
    }
  } catch (jsonErr) {
    console.warn("JSON.parse encountered syntax issue on AI response, attempting sanitization...", jsonErr);
    try {
      // Clean common trailing commas and control characters
      let cleaned = jsonStr
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => (char === '\n' || char === '\r' || char === '\t' ? char : ''));

      // Auto-repair truncated JSON arrays (when Gemini hits output token limit)
      const lastCloseObj = cleaned.lastIndexOf('}');
      const lastCloseArr = cleaned.lastIndexOf(']');
      if (lastCloseObj > lastCloseArr && lastCloseObj !== -1) {
        cleaned = cleaned.substring(0, lastCloseObj + 1) + "]}";
      }

      const rawData = JSON.parse(cleaned);
      const parsedData = normalizeExamData(rawData);
      if (parsedData.questions && parsedData.questions.length > 0) {
        setCachedExam(textHash, parsedData);
        return { status: 200, data: parsedData };
      }
    } catch (e) {
      console.warn("Secondary JSON cleanup failed, falling back to heuristic extractor.");
    }
  }

  // Last resort: the deterministic parser. It only returns results when it
  // actually read option sets and an answer key; otherwise we fail honestly.
  const local = buildLocalFallback(trimmedText, fileName);
  if (local) {
    setCachedExam(textHash, local);
    return { status: 200, data: local };
  }

  return {
    status: 422,
    data: {
      error: "Unable to parse valid exam questions from this document. Please make sure the file contains readable multiple-choice questions with an answer key and is not password-protected."
    }
  };
}
