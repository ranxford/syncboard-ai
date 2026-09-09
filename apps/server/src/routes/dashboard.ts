import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { activeTeammatesFor } from "../realtime/teammateNotify.js";
import { buildAllProjectSummariesForUser } from "../lib/dashboardProjects.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

/** Lightweight project health for the home dashboard. */
dashboardRouter.get("/", async (req: AuthedRequest, res) => {
  const projects = await buildAllProjectSummariesForUser(req.userId!);

  res.json({
    projects,
    teammates: await activeTeammatesFor(req.userId!),
  });
});
