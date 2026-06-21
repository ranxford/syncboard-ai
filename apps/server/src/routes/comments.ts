import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertMember } from "../lib/access.js";
import { recordActivity } from "../lib/board.js";
import { emitToProject } from "../realtime/io.js";

export const commentsRouter = Router();
commentsRouter.use(requireAuth);

function publicComment(c: {
  id: string;
  taskId: string;
  body: string;
  createdAt: Date;
  user: { id: string; name: string; avatarColor: string };
}) {
  return {
    id: c.id,
    taskId: c.taskId,
    body: c.body,
    createdAt: c.createdAt,
    user: c.user,
  };
}

// GET /tasks/:taskId/comments
commentsRouter.get("/tasks/:taskId/comments", async (req: AuthedRequest, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) return res.status(404).json({ error: "Task not found" });
  try {
    await assertMember(req.userId!, task.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const comments = await prisma.comment.findMany({
    where: { taskId: task.id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
  });
  res.json({ comments: comments.map(publicComment) });
});

const createSchema = z.object({ body: z.string().min(1).max(2000) });

// POST /tasks/:taskId/comments
commentsRouter.post("/tasks/:taskId/comments", async (req: AuthedRequest, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) return res.status(404).json({ error: "Task not found" });
  try {
    await assertMember(req.userId!, task.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Comment body is required" });

  const comment = await prisma.comment.create({
    data: { taskId: task.id, userId: req.userId!, body: parsed.data.body },
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
  });

  await recordActivity({
    projectId: task.projectId,
    userId: req.userId,
    type: "comment.added",
    message: `commented on "${task.title}"`,
    meta: { taskId: task.id },
  });

  const payload = publicComment(comment);
  emitToProject(task.projectId, "comment:added", { taskId: task.id, comment: payload });
  res.status(201).json({ comment: payload });
});

// DELETE /comments/:id (author only)
commentsRouter.delete("/comments/:id", async (req: AuthedRequest, res) => {
  const comment = await prisma.comment.findUnique({
    where: { id: req.params.id },
    include: { task: true },
  });
  if (!comment) return res.status(404).json({ error: "Comment not found" });
  if (comment.userId !== req.userId!) {
    return res.status(403).json({ error: "You can only delete your own comments" });
  }
  await prisma.comment.delete({ where: { id: comment.id } });
  emitToProject(comment.task.projectId, "comment:deleted", {
    taskId: comment.taskId,
    commentId: comment.id,
  });
  res.json({ ok: true });
});
