import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { tasksRouter } from "./routes/tasks.js";
import { analyticsRouter } from "./routes/analytics.js";
import { aiRouter } from "./routes/ai.js";
import { commentsRouter } from "./routes/comments.js";

/** Build the Express app (no socket server, no listen) so it can be reused by tests. */
export function createApp() {
  const app = express();

  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", ai: env.ai.provider, time: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api", tasksRouter);
  app.use("/api", analyticsRouter);
  app.use("/api", aiRouter);
  app.use("/api", commentsRouter);

  // Centralized error fallback
  app.use(
    (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("[error]", err);
      res.status(err.status ?? 500).json({ error: err.message ?? "Internal server error" });
    }
  );

  return app;
}
