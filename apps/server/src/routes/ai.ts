import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertMember, getMembership } from "../lib/access.js";
import { getBoardState, recordActivity, broadcastBoardUpdate } from "../lib/board.js";
import { canCreateTaskInColumn } from "../lib/taskVisibility.js";
import { isAdminRole } from "../lib/teammates.js";
import { ai } from "../ai/index.js";
import { env } from "../env.js";

export const aiRouter = Router();
aiRouter.use(requireAuth);

const meetingSchema = z.object({
  transcript: z.string().min(1).max(20000),
});

// GET /ai/provider — which AI engine is active (for UI badges)
aiRouter.get("/ai/provider", (_req, res) => {
  res.json({
    provider: ai.providerName(),
    model: env.ai.provider === "deepseek" ? env.ai.deepseekModel : env.ai.openaiModel,
    configured: env.ai.provider === "deepseek" ? !!env.ai.deepseekApiKey : !!env.ai.openaiApiKey,
  });
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
  if (!canCreateTaskInColumn(column.name)) {
    return res.status(400).json({
      error: "Import tasks into Backlog or To Do only — drag cards forward from there.",
    });
  }

  let order = await prisma.task.count({ where: { columnId: column.id } });

  const created = [];
  for (const item of parsed.data.items) {
    const task = await prisma.task.create({
      data: {
        projectId,
        columnId: column.id,
        title: item.title,
        priority: item.priority,
        assigneeId: item.assigneeId ?? req.userId!,
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

  await broadcastBoardUpdate(projectId);
  res.status(201).json({
    created: created.length,
    board: await getBoardState(projectId, { viewerId: req.userId! }),
  });
});

const generateTasksSchema = z.object({
  instruction: z.string().min(3).max(4000),
  columnId: z.string().min(1),
});

/** Admin asks DeepSeek to create tasks for every project member. */
aiRouter.post("/projects/:projectId/ai/generate-tasks", async (req: AuthedRequest, res) => {
  const { projectId } = req.params;
  try {
    await assertMember(req.userId!, projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const membership = await getMembership(req.userId!, projectId);
  if (!isAdminRole(membership?.role)) {
    return res.status(403).json({ error: "Only admins can ask DeepSeek to create tasks." });
  }

  const parsed = generateTasksSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid instruction" });

  const column = await prisma.column.findFirst({
    where: { id: parsed.data.columnId, projectId },
  });
  if (!column) return res.status(404).json({ error: "Column not found" });
  if (!canCreateTaskInColumn(column.name)) {
    return res.status(400).json({ error: "Target Backlog or To Do column only." });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const memberships = await prisma.membership.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true } } },
  });

  const members = memberships
    .filter((m) => m.role === "member" || m.role === "admin" || m.role === "owner")
    .map((m) => ({
      id: m.user.id,
      name: m.user.name,
      positionLabel: m.positionLabel,
      assignedRequirements: m.assignedRequirements,
    }));

  if (members.length === 0) {
    return res.status(400).json({ error: "No members to assign tasks to." });
  }

  const generated = await ai.generateMemberTasks({
    instruction: parsed.data.instruction,
    projectName: project.name,
    projectRequirements: project.requirements,
    members,
  });

  let order = await prisma.task.count({ where: { columnId: column.id } });
  const created = [];
  for (const item of generated) {
    const task = await prisma.task.create({
      data: {
        projectId,
        columnId: column.id,
        title: item.title,
        description: item.description ?? "",
        priority: item.priority,
        assigneeId: item.assigneeId,
        order: order++,
        enteredColumnAt: new Date(),
        labels: JSON.stringify(["deepseek"]),
      },
    });
    created.push(task);
  }

  await recordActivity({
    projectId,
    userId: req.userId,
    type: "ai.insight",
    message: `DeepSeek created ${created.length} task(s) for team members`,
    meta: { instruction: parsed.data.instruction.slice(0, 200), count: created.length },
  });

  await broadcastBoardUpdate(projectId);
  res.status(201).json({
    provider: ai.providerName(),
    created: created.length,
    tasks: created,
    board: await getBoardState(projectId, { viewerId: req.userId! }),
  });
});
