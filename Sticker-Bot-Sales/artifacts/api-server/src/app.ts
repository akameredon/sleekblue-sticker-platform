import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allow the storefront origin for both regular requests and SSE streams.
// Add your Replit/Vercel/Railway URL to FRONTEND_URL env var in production.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, same-host Replit)
      if (!origin) return callback(null, true);
      let parsedOrigin: URL;
      try {
        parsedOrigin = new URL(origin);
      } catch {
        return callback(new Error("CORS: invalid origin"));
      }
      const isExactAllowedOrigin = ALLOWED_ORIGINS.some((allowed) => {
        try { return new URL(allowed).origin === parsedOrigin.origin; }
        catch { return false; }
      });
      if (isExactAllowedOrigin) return callback(null, true);
      // Replit preview hosts are allowed by hostname suffix, not string prefix.
      if (
        parsedOrigin.protocol === "https:" &&
        (parsedOrigin.hostname.endsWith(".replit.dev") || parsedOrigin.hostname.endsWith(".repl.co"))
      ) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    // Required for SSE (text/event-stream) to work across origins
    exposedHeaders: ["Content-Type", "Cache-Control", "Connection"],
  }),
);

// ── Raw body for Paystack webhook sig validation ──────────────────────────────
// Must be registered BEFORE express.json() on the webhook route.
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Request logger ───────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use("/api", router);

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err.message.startsWith("CORS:")) {
    res.status(403).json({ error: err.message });
    return;
  }
  if (err.message.startsWith("Shop configuration is incomplete.")) {
    res.status(503).json({ error: err.message });
    return;
  }
  logger.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
