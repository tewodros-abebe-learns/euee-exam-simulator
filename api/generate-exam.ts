import { processExamGeneration } from "../src/server/examService";

export default async function handler(req: any, res: any) {
  // CORS: only allow explicitly configured origins. The browser calls this
  // endpoint same-origin, so no wildcard header is needed (and a wildcard let
  // any third-party page consume this deployment's AI quota).
  const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const requestOrigin = req.headers?.origin;
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const forwarded = req.headers?.["x-forwarded-for"];
    const clientIp =
      (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") ||
      (req.socket && req.socket.remoteAddress) ||
      "unknown";
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const result = await processExamGeneration(body, clientIp);
    return res.status(result.status).json(result.data);
  } catch (error: any) {
    console.error("API Serverless Error:", error);
    const errMsg = error?.message || String(error);
    if (errMsg.includes("429") || errMsg.includes("Too Many Requests") || errMsg.includes("RESOURCE_EXHAUSTED")) {
      return res.status(429).json({ error: "AI generation quota or rate limit reached. Please wait a moment and try again." });
    }
    if (errMsg.includes("SAFETY") || errMsg.includes("blocked")) {
      return res.status(403).json({ error: "The document content was flagged by safety filters. Please try a different file." });
    }
    return res.status(500).json({ error: errMsg || "Failed to parse exam questions from the document." });
  }
}
