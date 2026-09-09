import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertMember, getMembership } from "../lib/access.js";
import { getBoardState, parseLabels, recordActivity, broadcastBoardUpdate } from "../lib/board.js";
import { isDoneColumn, isReviewColumn } from "../lib/columns.js";
import { runProjectReviewAnalysis, runTaskReview } from "../lib/reviewGate.js";
import { canCreateTaskInColumn, taskVisibleToViewer } from "../lib/taskVisibility.js";
import { isAdminRole } from "../lib/teammates.js";
import { syncTimelinesFromTasks } from "../lib/timelineSync.js";
import { broadcastTimelineUpdated } from "../lib/timelineBroadcast.js";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

async function broadcast(projectId: string, assigneeIds?: (string | null | undefined)[]) {
  await syncTimelinesFromTasks(projectId, assigneeIds);
  await broadcastTimelineUpdated(
    projectId,
    assigneeIds?.filter((id): id is string => !!id),
  );
  await broadcastBoardUpdate(projectId);
  return getBoardState(projectId);
}

async function loadTaskForViewer(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return null;
  const membership = await getMembership(userId, task.projectId);
  if (!membership) return null;
  if (!taskVisibleToViewer(task.assigneeId, userId, membership.role)) return null;
  return { task, membership };
}

const labelsSchema = z.array(z.string().min(1).max(40)).max(20);

const createSchema = z.object({
  columnId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().nullable().optional(),
  estimateHours: z.number().positive().max(1000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  labels: labelsSchema.optional(),
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
  if (!canCreateTaskInColumn(column.name)) {
    return res.status(400).json({
      error: "New tasks can only be added in Backlog or To Do — drag cards forward from there.",
    });
  }

  const membership = await getMembership(req.userId!, projectId);
  let assigneeId = data.assigneeId ?? null;
  if (!isAdminRole(membership?.role)) {
    assigneeId = req.userId!;
  } else if (!assigneeId) {
    return res.status(400).json({
      error: "Assign this task to a team member — only they and admins will see it on the board.",
    });
  }

  const count = await prisma.task.count({ where: { columnId: data.columnId } });

  const task = await prisma.task.create({
    data: {
      projectId,
      columnId: data.columnId,
      title: data.title,
      description: data.description ?? "",
      priority: data.priority ?? "medium",
      assigneeId,
      estimateHours: data.estimateHours ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      labels: JSON.stringify(data.labels ?? []),
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

  const board = await broadcast(projectId, [assigneeId]);
  res.status(201).json({ task, board: await getBoardState(projectId, { viewerId: req.userId! }) });
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().nullable().optional(),
  estimateHours: z.number().positive().max(1000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  labels: labelsSchema.optional(),
});

// PATCH /tasks/:taskId
tasksRouter.patch("/tasks/:taskId", async (req: AuthedRequest, res) => {
  const loaded = await loadTaskForViewer(req.params.taskId, req.userId!);
  if (!loaded) return res.status(404).json({ error: "Task not found" });
  const { task, membership } = loaded;

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid update" });
  const data = parsed.data;

  if (data.assigneeId !== undefined && !isAdminRole(membership.role)) {
    return res.status(403).json({ error: "Only admins can reassign tasks" });
  }

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
      ...(data.labels !== undefined ? { labels: JSON.stringify(data.labels) } : {}),
    },
  });

  await recordActivity({
    projectId: task.projectId,
    userId: req.userId,
    type: "task.updated",
    message: `updated task "${updated.title}"`,
    meta: { taskId: task.id },
  });

  await broadcast(task.projectId, [
    task.assigneeId,
    data.assigneeId !== undefined ? data.assigneeId : task.assigneeId,
  ]);
  res.json({
    task: updated,
    board: await getBoardState(task.projectId, { viewerId: req.userId! }),
  });
});

const moveSchema = z.object({
  columnId: z.string().min(1),
  index: z.number().int().min(0),
});

// POST /tasks/:taskId/move
tasksRouter.post("/tasks/:taskId/move", async (req: AuthedRequest, res) => {
  const loaded = await loadTaskForViewer(req.params.taskId, req.userId!);
  if (!loaded) return res.status(404).json({ error: "Task not found" });
  const { task } = loaded;
  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid move" });
  const { columnId, index } = parsed.data;

  const targetColumn = await prisma.column.findFirst({
    where: { id: columnId, projectId: task.projectId },
  });
  if (!targetColumn) return res.status(404).json({ error: "Target column not found" });

  const membership = await getMembership(req.userId!, task.projectId);
  const movingToDone = await isDoneColumn(task.projectId, columnId);
  const movingToReview = await isReviewColumn(task.projectId, columnId);

  if (movingToDone && !task.reviewOverride && task.reviewStatus !== "passed") {
    if (!isAdminRole(membership?.role)) {
      return res.status(403).json({
        error:
          "DeepSeek review must pass before moving to Done. Move the task to Review and wait for approval.",
        reviewStatus: task.reviewStatus,
      });
    }
    return res.status(403).json({
      error:
        "Task has not passed DeepSeek review. Use Admin Override in the task panel, or move back to Review.",
      reviewStatus: task.reviewStatus,
    });
  }

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
        ...(columnChanged && movingToReview
          ? { reviewStatus: "pending", reviewFeedback: "Queued for DeepSeek review…", reviewOverride: false }
          : {}),
        ...(columnChanged && !movingToReview && !movingToDone && task.reviewStatus !== "none"
          ? { reviewStatus: "none", reviewFeedback: "", reviewOverride: false }
          : {}),
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

  await broadcast(task.projectId, [task.assigneeId]);

  if (columnChanged && movingToReview) {
    void runTaskReview(task.id).then(() => runProjectReviewAnalysis(task.projectId));
  }

  res.json({ board: await getBoardState(task.projectId, { viewerId: req.userId! }) });
});

// POST /tasks/:taskId/review — re-run DeepSeek review (member or admin)
tasksRouter.post("/tasks/:taskId/review", async (req: AuthedRequest, res) => {
  const loaded = await loadTaskForViewer(req.params.taskId, req.userId!);
  if (!loaded) return res.status(404).json({ error: "Task not found" });

  await runTaskReview(loaded.task.id);
  await runProjectReviewAnalysis(loaded.task.projectId);
  res.json({ board: await getBoardState(loaded.task.projectId, { viewerId: req.userId! }) });
});

// POST /tasks/:taskId/review-override — admin bypass review gate
tasksRouter.post("/tasks/:taskId/review-override", async (req: AuthedRequest, res) => {
  const loaded = await loadTaskForViewer(req.params.taskId, req.userId!);
  if (!loaded) return res.status(404).json({ error: "Task not found" });
  if (!isAdminRole(loaded.membership.role)) {
    return res.status(403).json({ error: "Only admins can override DeepSeek review." });
  }

  const updated = await prisma.task.update({
    where: { id: loaded.task.id },
    data: {
      reviewOverride: true,
      reviewStatus: "passed",
      reviewFeedback: "Admin override — review gate bypassed.",
      reviewCheckedAt: new Date(),
    },
  });

  await recordActivity({
    projectId: loaded.task.projectId,
    userId: req.userId,
    type: "ai.insight",
    message: `admin override for DeepSeek review on "${updated.title}"`,
    meta: { taskId: updated.id },
  });

  await broadcast(loaded.task.projectId, [loaded.task.assigneeId]);
  res.json({ task: updated, board: await getBoardState(loaded.task.projectId, { viewerId: req.userId! }) });
});

// GET /projects/:projectId/tasks/search?q=
tasksRouter.get("/projects/:projectId/tasks/search", async (req: AuthedRequest, res) => {
  const { projectId } = req.params;
  try {
    await assertMember(req.userId!, projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json({ results: [] });

  const membership = await getMembership(req.userId!, projectId);

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { labels: { contains: q } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      column: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, avatarColor: true } },
    },
  });

  const visible = tasks.filter((t) =>
    taskVisibleToViewer(t.assigneeId, req.userId!, membership?.role),
  );

  res.json({
    results: visible.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      labels: parseLabels(t.labels),
      column: t.column,
      assignee: t.assignee,
    })),
  });
});

// GET /me/tasks — tasks assigned to the current user across all projects
tasksRouter.get("/me/tasks", async (req: AuthedRequest, res) => {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: req.userId!, completedAt: null },
    include: {
      project: { select: { id: true, name: true } },
      column: { select: { id: true, name: true } },
    },
  });

  const mapped = tasks
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
      labels: parseLabels(t.labels),
      project: t.project,
      column: t.column,
    }))
    .sort((a, b) => {
      // due date ascending, nulls last
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

  res.json({ tasks: mapped });
});

// DELETE /tasks/:taskId
tasksRouter.delete("/tasks/:taskId", async (req: AuthedRequest, res) => {
  const loaded = await loadTaskForViewer(req.params.taskId, req.userId!);
  if (!loaded) return res.status(404).json({ error: "Task not found" });
  const { task } = loaded;

  await prisma.task.delete({ where: { id: task.id } });
  await recordActivity({
    projectId: task.projectId,
    userId: req.userId,
    type: "task.deleted",
    message: `deleted task "${task.title}"`,
  });

  await broadcast(task.projectId, [task.assigneeId]);
  res.json({ board: await getBoardState(task.projectId, { viewerId: req.userId! }) });
});
