import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertMember } from "../lib/access.js";
import { getBoardState, recordActivity } from "../lib/board.js";
import { emitToProject } from "../realtime/io.js";
import { serializeLabels } from "../lib/labels.js";

export const ideasRouter = Router();
ideasRouter.use(requireAuth);

async function serializeIdea(ideaId: string, viewerId: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: {
      author: { select: { id: true, name: true, avatarColor: true } },
      votes: { select: { userId: true } },
      _count: { select: { votes: true } },
    },
  });
  if (!idea) return null;
  return {
    id: idea.id,
    projectId: idea.projectId,
    title: idea.title,
    body: idea.body,
    status: idea.status,
    promotedTaskId: idea.promotedTaskId,
    createdAt: idea.createdAt,
    updatedAt: idea.updatedAt,
    author: idea.author,
    voteCount: idea._count.votes,
    votedByMe: idea.votes.some((v) => v.userId === viewerId),
  };
}

ideasRouter.get("/projects/:projectId/ideas", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const ideas = await prisma.idea.findMany({
    where: {
      projectId: req.params.projectId,
      status: { in: ["open", "promoted"] },
    },
    include: {
      author: { select: { id: true, name: true, avatarColor: true } },
      votes: { select: { userId: true } },
      _count: { select: { votes: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  // Sort open ideas by votes desc
  const mapped = ideas
    .map((idea) => ({
      id: idea.id,
      projectId: idea.projectId,
      title: idea.title,
      body: idea.body,
      status: idea.status,
      promotedTaskId: idea.promotedTaskId,
      createdAt: idea.createdAt,
      updatedAt: idea.updatedAt,
      author: idea.author,
      voteCount: idea._count.votes,
      votedByMe: idea.votes.some((v) => v.userId === req.userId!),
    }))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return b.voteCount - a.voteCount;
    });

  res.json({ ideas: mapped });
});

const createSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(2000).optional(),
});

ideasRouter.post("/projects/:projectId/ideas", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Title is required" });

  const idea = await prisma.idea.create({
    data: {
      projectId: req.params.projectId,
      authorId: req.userId!,
      title: parsed.data.title,
      body: parsed.data.body ?? "",
    },
  });

  await recordActivity({
    projectId: req.params.projectId,
    userId: req.userId,
    type: "idea.created",
    message: `suggested “${idea.title}”`,
  });

  const full = await serializeIdea(idea.id, req.userId!);
  res.status(201).json({ idea: full });
});

ideasRouter.post("/ideas/:id/vote", async (req: AuthedRequest, res) => {
  const idea = await prisma.idea.findUnique({ where: { id: req.params.id } });
  if (!idea) return res.status(404).json({ error: "Idea not found" });
  try {
    await assertMember(req.userId!, idea.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  if (idea.status !== "open") {
    return res.status(400).json({ error: "Can only vote on open ideas" });
  }

  const existing = await prisma.ideaVote.findUnique({
    where: { ideaId_userId: { ideaId: idea.id, userId: req.userId! } },
  });

  if (existing) {
    await prisma.ideaVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.ideaVote.create({
      data: { ideaId: idea.id, userId: req.userId! },
    });
  }

  const full = await serializeIdea(idea.id, req.userId!);
  res.json({ idea: full });
});

ideasRouter.post("/ideas/:id/promote", async (req: AuthedRequest, res) => {
  const idea = await prisma.idea.findUnique({ where: { id: req.params.id } });
  if (!idea) return res.status(404).json({ error: "Idea not found" });
  try {
    await assertMember(req.userId!, idea.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  if (idea.status === "promoted" && idea.promotedTaskId) {
    return res.status(400).json({ error: "Idea already promoted to a task" });
  }

  const backlog = await prisma.column.findFirst({
    where: { projectId: idea.projectId, name: "Backlog" },
  });
  const column =
    backlog ??
    (await prisma.column.findFirst({
      where: { projectId: idea.projectId },
      orderBy: { order: "asc" },
    }));
  if (!column) return res.status(400).json({ error: "Project has no columns" });

  const maxOrder = await prisma.task.aggregate({
    where: { columnId: column.id },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      projectId: idea.projectId,
      columnId: column.id,
      title: idea.title,
      description: idea.body || `Promoted from Ideas by suggestion.`,
      labels: serializeLabels(["idea"]),
      order: (maxOrder._max.order ?? -1) + 1,
      priority: "medium",
    },
  });

  await prisma.idea.update({
    where: { id: idea.id },
    data: { status: "promoted", promotedTaskId: task.id },
  });

  await recordActivity({
    projectId: idea.projectId,
    userId: req.userId,
    type: "idea.promoted",
    message: `promoted idea “${idea.title}” to the board`,
  });

  const board = await getBoardState(idea.projectId);
  emitToProject(idea.projectId, "board:updated", { board });

  const full = await serializeIdea(idea.id, req.userId!);
  res.json({ idea: full, board });
});

ideasRouter.delete("/ideas/:id", async (req: AuthedRequest, res) => {
  const idea = await prisma.idea.findUnique({ where: { id: req.params.id } });
  if (!idea) return res.status(404).json({ error: "Idea not found" });
  try {
    await assertMember(req.userId!, idea.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  if (idea.authorId !== req.userId!) {
    const m = await prisma.membership.findUnique({
      where: { userId_projectId: { userId: req.userId!, projectId: idea.projectId } },
    });
    if (!m || (m.role !== "owner" && m.role !== "admin")) {
      return res.status(403).json({ error: "Only the author or an admin can archive this idea" });
    }
  }
  await prisma.idea.update({
    where: { id: idea.id },
    data: { status: "archived" },
  });
  res.json({ ok: true });
});
