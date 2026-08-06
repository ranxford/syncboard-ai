import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { tasksRouter } from "./routes/tasks.js";
import { analyticsRouter } from "./routes/analytics.js";
import { aiRouter } from "./routes/ai.js";
import { commentsRouter } from "./routes/comments.js";
import { syncroomRouter } from "./routes/syncroom.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { milestonesRouter } from "./routes/milestones.js";
import { ideasRouter } from "./routes/ideas.js";
import { alignmentRouter } from "./routes/alignment.js";
import { submissionsRouter } from "./routes/submissions.js";
import { reviewSourcesRouter } from "./routes/reviewSources.js";

/** Build the Express app (no socket server, no listen) so it can be reused by tests. */
export function createApp() {
  const app = express();

  // Behind a proxy on most hosts (Render/Fly/etc.) — needed for correct client IPs.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // JSON API consumed cross-origin by the web app; allow cross-origin reads.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", async (_req, res) => {
    let db = "ok";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "error";
    }
    const healthy = db === "ok";
    res.status(healthy ? 200 : 503).json({
      status: healthy ? "ok" : "degraded",
      db,
      ai: env.ai.provider,
      time: new Date().toISOString(),
    });
  });

  // Friendly root — browsers hitting the API port shouldn't see Express's "Cannot GET /"
  app.get("/", (_req, res) => {
    res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"><title>SyncBoard API</title></head>
<body style="font-family:system-ui;background:#0b0f19;color:#e5e7eb;padding:2rem">
  <h1>SyncBoard AI+ API</h1>
  <p>This is the API server (port ${env.port}). Open the app at
    <a href="${env.webOrigin}" style="color:#2a9d8f">${env.webOrigin}</a>.
  </p>
  <p>Health: <a href="/health" style="color:#2a9d8f">/health</a></p>
</body></html>`);
  });

  // Throttle auth endpoints to blunt credential stuffing / brute force.
  // Disabled under test so the integration suite isn't rate-limited.
  if (process.env.NODE_ENV !== "test") {
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 50,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many attempts, please try again later." },
    });
    app.use("/api/auth/login", authLimiter);
    app.use("/api/auth/register", authLimiter);
  }

  app.use("/api/auth", authRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api", tasksRouter);
  app.use("/api", analyticsRouter);
  app.use("/api", aiRouter);
  app.use("/api", commentsRouter);
  app.use("/api/syncroom", syncroomRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api", milestonesRouter);
  app.use("/api", ideasRouter);
  app.use("/api", alignmentRouter);
  app.use("/api", submissionsRouter);
  app.use("/api", reviewSourcesRouter);

  // Centralized error fallback
  app.use(
    (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("[error]", err);
      res.status(err.status ?? 500).json({ error: err.message ?? "Internal server error" });
    }
  );

  return app;
}
