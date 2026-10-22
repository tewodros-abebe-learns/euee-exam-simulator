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

  res.setHeader("Cache-Control", "no-store");

  try {
    const forwarded = req.headers?.["x-forwarded-for"];
    const clientIp =
      (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") ||
      (req.socket && req.socket.remoteAddress) ||
      "unknown";

    let body: unknown;
    if (typeof req.body === "string") {
      try {
        body = JSON.parse(req.body);
      } catch {
        return res.status(400).json({ error: "The request body could not be read as JSON." });
      }
    } else {
      body = req.body ?? {};
    }

    const result = await processExamGeneration(body as any, clientIp);
    return res.status(result.status).json(result.data);
  } catch (error: any) {
    // Log the detail, return something the student can act on.
    console.error("API Serverless Error:", error);
    const errMsg = error?.message || String(error);
    if (errMsg.includes("429") || errMsg.includes("Too Many Requests") || errMsg.includes("RESOURCE_EXHAUSTED")) {
      return res.status(429).json({ error: "AI generation quota or rate limit reached. Please wait a moment and try again." });
    }
    if (errMsg.includes("SAFETY") || errMsg.includes("blocked")) {
      return res.status(403).json({ error: "The document content was flagged by safety filters. Please try a different file." });
    }
    return res.status(500).json({
      error: "The exam service hit an unexpected problem. Please try again, or import a JSON/Markdown file.",
    });
  }
}
