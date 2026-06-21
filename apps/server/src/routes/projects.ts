import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertMember } from "../lib/access.js";
import { getBoardState, recordActivity } from "../lib/board.js";
import { emitToProject } from "../realtime/io.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const DEFAULT_COLUMNS = [
  { name: "Backlog", order: 0, wipLimit: null },
  { name: "To Do", order: 1, wipLimit: null },
  { name: "In Progress", order: 2, wipLimit: 4 },
  { name: "Review", order: 3, wipLimit: 3 },
  { name: "Done", order: 4, wipLimit: null },
];

projectsRouter.get("/", async (req: AuthedRequest, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.userId! },
    include: {
      project: {
        include: {
          _count: { select: { tasks: true, members: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const projects = memberships.map((m) => ({
    id: m.project.id,
    name: m.project.name,
    description: m.project.description,
    role: m.role,
    taskCount: m.project._count.tasks,
    memberCount: m.project._count.members,
    createdAt: m.project.createdAt,
  }));

  res.json({ projects });
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
});

projectsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Project name is required" });
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      ownerId: req.userId!,
      members: { create: { userId: req.userId!, role: "owner" } },
      columns: { create: DEFAULT_COLUMNS },
    },
  });

  await recordActivity({
    projectId: project.id,
    userId: req.userId,
    type: "project.created",
    message: `created the project`,
  });

  const board = await getBoardState(project.id);
  res.status(201).json({ board });
});

projectsRouter.get("/:id", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.id);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const board = await getBoardState(req.params.id);
  if (!board) return res.status(404).json({ error: "Project not found" });
  res.json({ board });
});

projectsRouter.get("/:id/activity", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.id);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const activities = await prisma.activity.findMany({
    where: { projectId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
  });
  res.json({
    activities: activities.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      meta: JSON.parse(a.meta || "{}"),
      createdAt: a.createdAt,
      user: a.user,
    })),
  });
});

projectsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (project.ownerId !== req.userId!) {
    return res.status(403).json({ error: "Only the project owner can delete it" });
  }
  // related columns/tasks/memberships/activities cascade via schema onDelete rules
  await prisma.project.delete({ where: { id: project.id } });
  res.json({ ok: true });
});

const addMemberSchema = z.object({ email: z.string().email() });

projectsRouter.post("/:id/members", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.id);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid email required" });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user) return res.status(404).json({ error: "No user with that email" });

  const existing = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: user.id, projectId: req.params.id } },
  });
  if (existing) return res.status(409).json({ error: "User is already a member" });

  await prisma.membership.create({
    data: { userId: user.id, projectId: req.params.id, role: "member" },
  });

  await recordActivity({
    projectId: req.params.id,
    userId: user.id,
    type: "member.joined",
    message: `${user.name} was added to the project`,
  });

  const board = await getBoardState(req.params.id);
  emitToProject(req.params.id, "board:updated", { board });
  res.status(201).json({ board });
});
