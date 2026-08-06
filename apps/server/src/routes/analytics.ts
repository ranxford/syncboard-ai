import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertMember, getMembership } from "../lib/access.js";
import { getBoardState } from "../lib/board.js";
import { ai } from "../ai/index.js";
import type { AiBoard } from "../ai/types.js";
import { insightsFromAlignment } from "../ai/alignmentInsights.js";
import {
  buildAlignmentReport,
  filterAlignmentReportForViewer,
} from "../lib/alignmentReport.js";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

function toAiBoard(board: NonNullable<Awaited<ReturnType<typeof getBoardState>>>): AiBoard {
  return {
    members: board.members.map((m) => ({
      id: m.id,
      name: m.name,
      avatarColor: m.avatarColor,
    })),
    columns: board.columns.map((c) => ({
      id: c.id,
      name: c.name,
      order: c.order,
      wipLimit: c.wipLimit,
      tasks: c.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        assigneeId: t.assigneeId,
        estimateHours: t.estimateHours,
        dueDate: t.dueDate,
        enteredColumnAt: t.enteredColumnAt,
        completedAt: t.completedAt,
        createdAt: t.createdAt,
      })),
    })),
  };
}

// GET /projects/:projectId/analytics
analyticsRouter.get("/projects/:projectId/analytics", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const board = await getBoardState(req.params.projectId);
  if (!board) return res.status(404).json({ error: "Project not found" });

  const membership = await getMembership(req.userId!, req.params.projectId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  const analysis = await ai.analyzeBoard(toAiBoard(board));

  const built = await buildAlignmentReport(req.params.projectId);
  if (built) {
    const report = filterAlignmentReportForViewer(built.report, req.userId!, isAdmin);
    analysis.insights = [...analysis.insights, ...insightsFromAlignment(report)];
  }

  res.json({ analytics: analysis });
});
