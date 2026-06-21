import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertMember } from "../lib/access.js";
import { getBoardState, recordActivity } from "../lib/board.js";
import { isDoneColumn } from "../lib/columns.js";
import { emitToProject } from "../realtime/io.js";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

async function broadcast(projectId: string, userId?: string) {
  const board = await getBoardState(projectId);
  emitToProject(projectId, "board:updated", { board });
  return board;
}

const createSchema = z.object({
  columnId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().nullable().optional(),
  estimateHours: z.number().positive().max(1000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

// POST /projects/:projectId/tasks
tasksRouter.post("/projects/:projectId/tasks", async (req: AuthedRequest, res) => {
  const { projectId } = req.params;
  try {
    await assertMember(req.userId!, projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid task" });
  }
  const data = parsed.data;

  const column = await prisma.column.findFirst({ where: { id: data.columnId, projectId } });
  if (!column) return res.status(404).json({ error: "Column not found" });

  const count = await prisma.task.count({ where: { columnId: data.columnId } });

  const task = await prisma.task.create({
    data: {
      projectId,
      columnId: data.columnId,
      title: data.title,
      description: data.description ?? "",
      priority: data.priority ?? "medium",
      assigneeId: data.assigneeId ?? null,
      estimateHours: data.estimateHours ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      order: count,
      enteredColumnAt: new Date(),
    },
  });

  await recordActivity({
    projectId,
    userId: req.userId,
    type: "task.created",
    message: `created task "${task.title}"`,
    meta: { taskId: task.id },
  });

  const board = await broadcast(projectId);
  res.status(201).json({ task, board });
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().nullable().optional(),
  estimateHours: z.number().positive().max(1000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

// PATCH /tasks/:taskId
tasksRouter.patch("/tasks/:taskId", async (req: AuthedRequest, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) return res.status(404).json({ error: "Task not found" });
  try {
    await assertMember(req.userId!, task.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update" });
  const data = parsed.data;

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
      ...(data.estimateHours !== undefined ? { estimateHours: data.estimateHours } : {}),
      ...(data.dueDate !== undefined
        ? { dueDate: data.dueDate ? new Date(data.dueDate) : null }
        : {}),
    },
  });

  await recordActivity({
    projectId: task.projectId,
    userId: req.userId,
    type: "task.updated",
    message: `updated task "${updated.title}"`,
    meta: { taskId: task.id },
  });

  const board = await broadcast(task.projectId);
  res.json({ task: updated, board });
});

const moveSchema = z.object({
  columnId: z.string().min(1),
  index: z.number().int().min(0),
});

// POST /tasks/:taskId/move
tasksRouter.post("/tasks/:taskId/move", async (req: AuthedRequest, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) return res.status(404).json({ error: "Task not found" });
  try {
    await assertMember(req.userId!, task.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid move" });
  const { columnId, index } = parsed.data;

  const targetColumn = await prisma.column.findFirst({
    where: { id: columnId, projectId: task.projectId },
  });
  if (!targetColumn) return res.status(404).json({ error: "Target column not found" });

  const columnChanged = task.columnId !== columnId;

  // tasks currently in target column (excluding the moved task), ordered
  const siblings = (
    await prisma.task.findMany({
      where: { columnId, NOT: { id: task.id } },
      orderBy: { order: "asc" },
    })
  ).map((t) => t.id);

  const clamped = Math.min(index, siblings.length);
  siblings.splice(clamped, 0, task.id);

  const nowDone = await isDoneColumn(task.projectId, columnId);

  await prisma.$transaction([
    // reindex target column
    ...siblings.map((id, i) =>
      prisma.task.update({ where: { id }, data: { order: i } }),
    ),
    // update the moved task's column + lifecycle fields
    prisma.task.update({
      where: { id: task.id },
      data: {
        columnId,
        ...(columnChanged ? { enteredColumnAt: new Date() } : {}),
        completedAt: nowDone ? task.completedAt ?? new Date() : null,
      },
    }),
  ]);

  // re-pack the source column if the task left it
  if (columnChanged) {
    const sourceTasks = await prisma.task.findMany({
      where: { columnId: task.columnId },
      orderBy: { order: "asc" },
    });
    await prisma.$transaction(
      sourceTasks.map((t, i) => prisma.task.update({ where: { id: t.id }, data: { order: i } })),
    );
  }

  await recordActivity({
    projectId: task.projectId,
    userId: req.userId,
    type: "task.moved",
    message: `moved "${task.title}" to ${targetColumn.name}`,
    meta: { taskId: task.id, columnId },
  });

  const board = await broadcast(task.projectId);
  res.json({ board });
});

// DELETE /tasks/:taskId
tasksRouter.delete("/tasks/:taskId", async (req: AuthedRequest, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) return res.status(404).json({ error: "Task not found" });
  try {
    await assertMember(req.userId!, task.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  await prisma.task.delete({ where: { id: task.id } });
  await recordActivity({
    projectId: task.projectId,
    userId: req.userId,
    type: "task.deleted",
    message: `deleted task "${task.title}"`,
  });

  const board = await broadcast(task.projectId);
  res.json({ board });
});
