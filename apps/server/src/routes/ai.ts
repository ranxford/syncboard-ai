import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertMember } from "../lib/access.js";
import { getBoardState, recordActivity } from "../lib/board.js";
import { ai } from "../ai/index.js";
import { emitToProject } from "../realtime/io.js";

export const aiRouter = Router();
aiRouter.use(requireAuth);

const meetingSchema = z.object({
  transcript: z.string().min(1).max(20000),
});

// POST /ai/meeting — summarize a transcript + extract action items
aiRouter.post("/ai/meeting", async (req: AuthedRequest, res) => {
  const parsed = meetingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Transcript is required" });
  const result = await ai.summarizeMeeting(parsed.data.transcript);
  res.json({ result });
});

const importSchema = z.object({
  columnId: z.string().min(1),
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        assigneeId: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(50),
});

// POST /projects/:projectId/ai/import-tasks — turn extracted action items into tasks
aiRouter.post("/projects/:projectId/ai/import-tasks", async (req: AuthedRequest, res) => {
  const { projectId } = req.params;
  try {
    await assertMember(req.userId!, projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid import payload" });

  const column = await prisma.column.findFirst({
    where: { id: parsed.data.columnId, projectId },
  });
  if (!column) return res.status(404).json({ error: "Column not found" });

  let order = await prisma.task.count({ where: { columnId: column.id } });

  const created = [];
  for (const item of parsed.data.items) {
    const task = await prisma.task.create({
      data: {
        projectId,
        columnId: column.id,
        title: item.title,
        priority: item.priority,
        assigneeId: item.assigneeId ?? null,
        order: order++,
        enteredColumnAt: new Date(),
      },
    });
    created.push(task);
  }

  await recordActivity({
    projectId,
    userId: req.userId,
    type: "ai.insight",
    message: `imported ${created.length} task(s) from a meeting`,
    meta: { count: created.length },
  });

  const board = await getBoardState(projectId);
  emitToProject(projectId, "board:updated", { board });
  res.status(201).json({ created: created.length, board });
});
