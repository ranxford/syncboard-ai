import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertMember } from "../lib/access.js";

export const syncroomRouter = Router();
syncroomRouter.use(requireAuth);

const finalizeSchema = z.object({
  notes: z.string().max(20_000).optional(),
  summary: z.string().max(10_000).optional(),
  decisions: z.array(z.string()).optional(),
  whiteboard: z.string().max(500_000).optional(),
  applied: z.boolean().optional(),
});

const artifactSchema = z.object({
  label: z.string().min(1).max(200),
  url: z.string().url().max(2000),
});

syncroomRouter.patch("/sessions/:id", async (req: AuthedRequest, res) => {
  const session = await prisma.syncRoomSession.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: "Session not found" });

  try {
    await assertMember(req.userId!, session.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const parsed = finalizeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const updated = await prisma.syncRoomSession.update({
    where: { id: session.id },
    data: {
      notes: parsed.data.notes ?? session.notes,
      summary: parsed.data.summary ?? session.summary,
      decisions:
        parsed.data.decisions !== undefined
          ? JSON.stringify(parsed.data.decisions)
          : session.decisions,
      whiteboard: parsed.data.whiteboard ?? session.whiteboard,
      endedAt: session.endedAt ?? new Date(),
      appliedAt: parsed.data.applied ? new Date() : session.appliedAt,
    },
  });

  res.json({
    session: {
      id: updated.id,
      projectId: updated.projectId,
      contextTaskId: updated.contextTaskId,
      contextTaskTitle: updated.contextTaskTitle,
      startedAt: updated.startedAt,
      endedAt: updated.endedAt,
      notes: updated.notes,
      summary: updated.summary,
      decisions: JSON.parse(updated.decisions || "[]"),
      appliedAt: updated.appliedAt,
    },
  });
});

syncroomRouter.get("/tasks/:taskId/sessions", async (req: AuthedRequest, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  try {
    await assertMember(req.userId!, task.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const sessions = await prisma.syncRoomSession.findMany({
    where: { contextTaskId: task.id },
    orderBy: { startedAt: "desc" },
    take: 10,
    include: {
      startedBy: { select: { id: true, name: true, avatarColor: true } },
      artifacts: { orderBy: { createdAt: "asc" } },
      _count: { select: { events: true } },
    },
  });

  res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      contextTaskTitle: s.contextTaskTitle,
      summary: s.summary,
      decisions: JSON.parse(s.decisions || "[]"),
      appliedAt: s.appliedAt,
      eventCount: s._count.events,
      startedBy: s.startedBy,
      artifacts: s.artifacts.map((a) => ({
        id: a.id,
        label: a.label,
        url: a.url,
        createdAt: a.createdAt,
      })),
    })),
  });
});

syncroomRouter.post("/sessions/:id/artifacts", async (req: AuthedRequest, res) => {
  const session = await prisma.syncRoomSession.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: "Session not found" });
  try {
    await assertMember(req.userId!, session.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const parsed = artifactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid label and URL required" });

  const artifact = await prisma.syncRoomArtifact.create({
    data: { sessionId: session.id, label: parsed.data.label, url: parsed.data.url },
  });
  res.status(201).json({
    artifact: {
      id: artifact.id,
      label: artifact.label,
      url: artifact.url,
      createdAt: artifact.createdAt,
    },
  });
});

syncroomRouter.get("/sessions/:id/artifacts", async (req: AuthedRequest, res) => {
  const session = await prisma.syncRoomSession.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: "Session not found" });
  try {
    await assertMember(req.userId!, session.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const artifacts = await prisma.syncRoomArtifact.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
  });
  res.json({
    artifacts: artifacts.map((a) => ({
      id: a.id,
      label: a.label,
      url: a.url,
      createdAt: a.createdAt,
    })),
  });
});
