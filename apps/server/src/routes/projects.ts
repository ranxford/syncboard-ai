import { randomBytes } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertCanManageTeam, assertMember, assertOwner, getMembership } from "../lib/access.js";
import { activityVisibleToViewer, getBoardState, recordActivity } from "../lib/board.js";
import { emitToProject } from "../realtime/io.js";
import { COMMUNITY_MILESTONES, ensurePersonalTimeline } from "../lib/timelines.js";
import { columnsForField, isProjectField } from "../lib/projectFields.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

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
    visibility: m.project.visibility,
    field: m.project.field,
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
  visibility: z.enum(["personal", "shared"]).optional(),
  field: z.string().min(1).max(40).optional(),
});

projectsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Project name is required" });
  }

  const visibility = parsed.data.visibility ?? "shared";
  const field = parsed.data.field && isProjectField(parsed.data.field) ? parsed.data.field : "general";

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      visibility,
      field,
      ownerId: req.userId!,
      members: { create: { userId: req.userId!, role: "owner" } },
      columns: { create: columnsForField(field) },
      milestones: {
        create: COMMUNITY_MILESTONES.map((m) => ({
          title: m.title,
          description: m.description,
          status: m.status,
          order: m.order,
          ownerId: null,
        })),
      },
    },
  });

  await ensurePersonalTimeline(project.id, req.userId!);

  await recordActivity({
    projectId: project.id,
    userId: req.userId,
    type: "project.created",
    message: `created the ${visibility === "personal" ? "personal" : "community"} project`,
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

projectsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  try {
    await assertOwner(req.userId!, req.params.id);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const parsed = z
    .object({
      name: z.string().min(1).max(80).optional(),
      description: z.string().max(500).optional(),
      visibility: z.enum(["personal", "shared"]).optional(),
      field: z.string().min(1).max(40).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  if (parsed.data.field !== undefined && !isProjectField(parsed.data.field)) {
    return res.status(400).json({ error: "Unknown project field" });
  }

  if (parsed.data.visibility === "personal") {
    const count = await prisma.membership.count({ where: { projectId: req.params.id } });
    if (count > 1) {
      return res.status(400).json({
        error: "Remove other members before switching to a personal workspace",
      });
    }
  }

  await prisma.project.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  const board = await getBoardState(req.params.id);
  emitToProject(req.params.id, "board:updated", { board });
  res.json({ board });
});

projectsRouter.get("/:id/activity", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.id);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const membership = await getMembership(req.userId!, req.params.id);
  const activities = await prisma.activity.findMany({
    where: { projectId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
  });
  res.json({
    activities: activities
      .filter((a) =>
        activityVisibleToViewer(a.meta, membership?.role, req.userId!, a.userId),
      )
      .slice(0, 50)
      .map((a) => ({
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
  await prisma.project.delete({ where: { id: project.id } });
  res.json({ ok: true });
});

/** List members + pending invites (team management). */
projectsRouter.get("/:id/members", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.id);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const [members, invites, project] = await Promise.all([
    prisma.membership.findMany({
      where: { projectId: req.params.id },
      include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.projectInvite.findMany({
      where: { projectId: req.params.id, status: "pending" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findUnique({ where: { id: req.params.id }, select: { visibility: true } }),
  ]);

  res.json({
    visibility: project?.visibility ?? "shared",
    members: members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatarColor: m.user.avatarColor,
      role: m.role,
      membershipId: m.id,
      joinedAt: m.createdAt,
    })),
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
    })),
  });
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).optional(),
});

projectsRouter.post("/:id/members", async (req: AuthedRequest, res) => {
  try {
    await assertCanManageTeam(req.userId!, req.params.id);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid email required" });

  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  if (project.visibility === "personal") {
    await prisma.project.update({
      where: { id: project.id },
      data: { visibility: "shared" },
    });
  }

  const email = parsed.data.email.toLowerCase();
  const role = parsed.data.role ?? "member";
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const existing = await prisma.membership.findUnique({
      where: { userId_projectId: { userId: user.id, projectId: req.params.id } },
    });
    if (existing) return res.status(409).json({ error: "User is already a member" });

    await prisma.membership.create({
      data: { userId: user.id, projectId: req.params.id, role },
    });
    await ensurePersonalTimeline(req.params.id, user.id);

    await recordActivity({
      projectId: req.params.id,
      userId: user.id,
      type: "member.joined",
      message: `${user.name} joined the community`,
    });

    const board = await getBoardState(req.params.id);
    emitToProject(req.params.id, "board:updated", { board });
    return res.status(201).json({ board, invited: { email, status: "joined" } });
  }

  const pending = await prisma.projectInvite.findFirst({
    where: { projectId: req.params.id, email, status: "pending" },
  });
  if (pending) return res.status(409).json({ error: "Invite already pending for that email" });

  const invite = await prisma.projectInvite.create({
    data: {
      projectId: req.params.id,
      email,
      role,
      token: randomBytes(24).toString("hex"),
      invitedById: req.userId!,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await recordActivity({
    projectId: req.params.id,
    userId: req.userId,
    type: "member.invited",
    message: `invited ${email} to the project`,
  });

  console.log(`[invite] Pending invite for ${email} on project ${req.params.id}: token=${invite.token}`);

  res.status(201).json({
    invited: { email, status: "pending", inviteId: invite.id },
    message: "No account yet — invite saved. They join automatically after signup + email confirm.",
  });
});

projectsRouter.patch("/:id/members/:userId", async (req: AuthedRequest, res) => {
  try {
    await assertCanManageTeam(req.userId!, req.params.id);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const parsed = z.object({ role: z.enum(["admin", "member"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Role must be admin or member" });

  const target = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: req.params.userId, projectId: req.params.id } },
  });
  if (!target) return res.status(404).json({ error: "Member not found" });
  if (target.role === "owner") {
    return res.status(400).json({ error: "Cannot change the owner's role" });
  }

  await prisma.membership.update({
    where: { id: target.id },
    data: { role: parsed.data.role },
  });

  res.json({ ok: true, role: parsed.data.role });
});

projectsRouter.delete("/:id/members/:userId", async (req: AuthedRequest, res) => {
  try {
    await assertCanManageTeam(req.userId!, req.params.id);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const target = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: req.params.userId, projectId: req.params.id } },
    include: { user: { select: { name: true } } },
  });
  if (!target) return res.status(404).json({ error: "Member not found" });
  if (target.role === "owner") {
    return res.status(400).json({ error: "Cannot remove the project owner" });
  }
  if (target.userId === req.userId!) {
    return res.status(400).json({ error: "Use leave project to remove yourself" });
  }

  await prisma.membership.delete({ where: { id: target.id } });
  await recordActivity({
    projectId: req.params.id,
    userId: req.userId,
    type: "member.removed",
    message: `removed ${target.user.name} from the project`,
  });

  const board = await getBoardState(req.params.id);
  emitToProject(req.params.id, "board:updated", { board });
  res.json({ board });
});

projectsRouter.delete("/:id/invites/:inviteId", async (req: AuthedRequest, res) => {
  try {
    await assertCanManageTeam(req.userId!, req.params.id);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const invite = await prisma.projectInvite.findFirst({
    where: { id: req.params.inviteId, projectId: req.params.id },
  });
  if (!invite) return res.status(404).json({ error: "Invite not found" });
  await prisma.projectInvite.update({
    where: { id: invite.id },
    data: { status: "revoked" },
  });
  res.json({ ok: true });
});
