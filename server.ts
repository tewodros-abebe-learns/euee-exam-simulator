import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { processExamGeneration } from "./src/server/examService";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // ==========================================
  // Proxy & Security Middlewares
  // ==========================================
  // Enable trust proxy for Cloud Run and reverse proxies (ensures rate-limiting correctly identifies clients)
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  
  // Use Helmet for robust HTTP security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for local dev/Vite, restrict in production
    crossOriginOpenerPolicy: false, // REQUIRED for Firebase Auth popups to work in iframes
    crossOriginResourcePolicy: false, // REQUIRED for cross-origin popup messaging
    frameguard: false, // REQUIRED for AI Studio preview iframe to work
  }));

  // The app asks for none of these; denying them here means a future dependency
  // cannot quietly start using the camera or location.
  app.use((_req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    );
    next();
  });

  // CORS: same-origin only unless an explicit allow-list is configured.
  // (The previous wildcard let any website spend this server's AI quota.)
  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  }));

  // Rate Limiting (Prevent abuse / DDoS on API routes)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: true, 
    legacyHeaders: false, 
    validate: {
      xForwardedForHeader: false,
      forwardedHeader: false,
    },
    message: { error: "Too many requests, please try again later." }
  });

  const aiGenerationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit AI generations to 20 per hour per IP
    standardHeaders: true, 
    legacyHeaders: false, 
    validate: {
      xForwardedForHeader: false,
      forwardedHeader: false,
    },
    message: { error: "AI generation quota reached for this hour. Please try again later." }
  });

  // Security headers and the broad rate limit come first: they cost almost
  // nothing, and they must run before any body is buffered.
  app.use("/api/", apiLimiter);
  app.use("/api/", (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Answers depend on the posted document; never let a proxy cache them.
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  // The AI quota is limited before the (up to 20 MB) body is parsed, so a
  // flood of oversized uploads cannot be used to exhaust memory.
  app.use("/api/generate-exam", aiGenerationLimiter);

  // Base64 uploads are ~15MB of file at most; 20MB of JSON is enough.
  app.use(express.json({ limit: '20mb', strict: true }));

  // Malformed JSON must come back as JSON (the default is an HTML error page
  // that the client then fails to parse).
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!err) return next();
    const isBodyError = err.type === 'entity.parse.failed' || err.type === 'entity.too.large' || err.status === 413;
    if (!isBodyError) return next(err);
    const message =
      err.status === 413
        ? 'That upload is too large. Please split the document and try again.'
        : 'The request body could not be read as JSON.';
    res.status(err.status === 413 ? 413 : 400).json({ error: message });
  });

  // API routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Apply strict limiter to AI generation
  app.post("/api/generate-exam", async (req, res) => {
    try {
      // `trust proxy` is enabled above, so req.ip reflects the real client.
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const result = await processExamGeneration(req.body, clientIp);
      res.status(result.status).json(result.data);
    } catch (error: any) {
      console.error("Server API Error:", error);
      const errMsg = error?.message || String(error);
      if (errMsg.includes("429") || errMsg.includes("Too Many Requests") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("resource_exhausted")) {
        return res.status(429).json({ error: "AI generation quota or rate limit reached. Please wait a moment or check your API quota, then try again." });
      }
      if (errMsg.includes("SAFETY") || errMsg.includes("blocked")) {
        return res.status(403).json({ error: "The document content was flagged by safety filters. Please try a different file." });
      }
      if (errMsg.includes("404") || errMsg.includes("NOT_FOUND")) {
        return res.status(404).json({ error: "The requested AI model could not be found. Please retry." });
      }

      // Never echo an internal message (stack details, upstream URLs) to the
      // browser: log it here and give the student an actionable sentence.
      res.status(500).json({
        error: "The exam service hit an unexpected problem. Please try again, or import a JSON/Markdown file.",
      });
    }
  });

  // Any other /api path (or a wrong method on a real one) is a JSON 404, never
  // the SPA's HTML shell — that used to look like a successful response.
  app.use("/api", (req, res) => {
    res.status(404).json({
      error: `Unknown API route: ${req.method} ${req.originalUrl.split('?')[0]}`,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown so containers (Cloud Run, Railway, Docker) stop cleanly.
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();

