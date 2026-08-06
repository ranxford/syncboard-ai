import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertMember, getMembership } from "../lib/access.js";
import { recordActivity } from "../lib/board.js";
import { ensurePersonalTimeline, milestoneProgress } from "../lib/timelines.js";
import { resolveMemberBrief } from "../lib/alignmentPositions.js";

export const milestonesRouter = Router();
milestonesRouter.use(requireAuth);

function serialize(m: {
  id: string;
  projectId: string;
  ownerId: string | null;
  title: string;
  description: string;
  status: string;
  order: number;
  targetDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: m.id,
    projectId: m.projectId,
    ownerId: m.ownerId,
    title: m.title,
    description: m.description,
    status: m.status,
    order: m.order,
    targetDate: m.targetDate,
    completedAt: m.completedAt,
    createdAt: m.createdAt,
  };
}

/**
 * Returns community timeline + personal timelines.
 * Members see community + their own.
 * Owner/admin also see every collaborator's timeline.
 */
milestonesRouter.get("/projects/:projectId/timelines", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const projectId = req.params.projectId;
  await ensurePersonalTimeline(projectId, req.userId!);

  const membership = await getMembership(req.userId!, projectId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  const [members, allMilestones, boardTasks, boardDone, project] = await Promise.all([
    prisma.membership.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, avatarColor: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.milestone.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    }),
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, completedAt: { not: null } } }),
    prisma.project.findUnique({ where: { id: projectId }, select: { field: true } }),
  ]);

  const projectField = project?.field ?? "general";

  // Backfill personal timelines for all members (admin view needs them)
  if (isAdmin) {
    await Promise.all(members.map((m) => ensurePersonalTimeline(projectId, m.userId)));
  }

  const milestones = isAdmin
    ? await prisma.milestone.findMany({ where: { projectId }, orderBy: { order: "asc" } })
    : allMilestones.filter((m) => m.ownerId === null || m.ownerId === req.userId!);

  const community = milestones.filter((m) => m.ownerId === null).map(serialize);

  const personalByUser = new Map<string, ReturnType<typeof serialize>[]>();
  for (const m of milestones) {
    if (!m.ownerId) continue;
    const list = personalByUser.get(m.ownerId) ?? [];
    list.push(serialize(m));
    personalByUser.set(m.ownerId, list);
  }

  const memberTimelines = members
    .filter((m) => isAdmin || m.userId === req.userId!)
    .map((m) => {
      const ms = personalByUser.get(m.userId) ?? [];
      const brief = resolveMemberBrief({
        field: projectField,
        positionKey: m.positionKey,
        positionLabel: m.positionLabel,
        assignedRequirements: m.assignedRequirements,
      });
      return {
        userId: m.user.id,
        name: m.user.name,
        avatarColor: m.user.avatarColor,
        role: m.role,
        positionKey: brief.positionKey,
        positionLabel: brief.positionLabel,
        isMe: m.userId === req.userId!,
        milestones: ms,
        progressPct: milestoneProgress(ms),
      };
    });

  res.json({
    community: {
      milestones: community,
      progressPct: milestoneProgress(community),
    },
    members: memberTimelines,
    boardProgress: {
      totalTasks: boardTasks,
      doneTasks: boardDone,
      progressPct: boardTasks === 0 ? 0 : Math.round((boardDone / boardTasks) * 100),
    },
    canManageCommunity: isAdmin,
  });
});

/** @deprecated alias — prefer /timelines */
milestonesRouter.get("/projects/:projectId/milestones", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  await ensurePersonalTimeline(req.params.projectId, req.userId!);
  const milestones = await prisma.milestone.findMany({
    where: {
      projectId: req.params.projectId,
      OR: [{ ownerId: null }, { ownerId: req.userId! }],
    },
    orderBy: { order: "asc" },
  });
  const totalTasks = await prisma.task.count({ where: { projectId: req.params.projectId } });
  const doneTasks = await prisma.task.count({
    where: { projectId: req.params.projectId, completedAt: { not: null } },
  });
  res.json({
    milestones: milestones.map(serialize),
    progress: {
      totalTasks,
      doneTasks,
      progressPct: totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100),
    },
  });
});

const createSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  status: z.enum(["upcoming", "active", "done"]).optional(),
  targetDate: z.string().datetime().optional().nullable(),
  // "community" | "personal" (default personal for members, community for admin create without flag)
  scope: z.enum(["community", "personal"]).optional(),
});

milestonesRouter.post("/projects/:projectId/milestones", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Title is required" });

  const membership = await getMembership(req.userId!, req.params.projectId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const scope = parsed.data.scope ?? (isAdmin ? "community" : "personal");

  if (scope === "community" && !isAdmin) {
    return res.status(403).json({ error: "Only owners and admins can edit the community timeline" });
  }

  const ownerId = scope === "community" ? null : req.userId!;

  if (scope === "personal") {
    await ensurePersonalTimeline(req.params.projectId, req.userId!);
  }

  const maxOrder = await prisma.milestone.aggregate({
    where: { projectId: req.params.projectId, ownerId },
    _max: { order: true },
  });

  const milestone = await prisma.milestone.create({
    data: {
      projectId: req.params.projectId,
      ownerId,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      status: parsed.data.status ?? "upcoming",
      order: (maxOrder._max.order ?? -1) + 1,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      completedAt: parsed.data.status === "done" ? new Date() : null,
    },
  });

  await recordActivity({
    projectId: req.params.projectId,
    userId: req.userId,
    type: "milestone.created",
    message:
      scope === "community"
        ? `added community milestone “${milestone.title}”`
        : `updated their personal timeline: “${milestone.title}”`,
    audience: scope === "personal" ? "admins" : "all",
  });

  res.status(201).json({ milestone: serialize(milestone) });
});

/** Share a personal milestone onto the community track so all members can see it. */
milestonesRouter.post("/milestones/:id/share-to-community", async (req: AuthedRequest, res) => {
  const existing = await prisma.milestone.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Milestone not found" });

  try {
    await assertMember(req.userId!, existing.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  if (existing.ownerId === null) {
    return res.status(400).json({ error: "Already on the community timeline" });
  }
  if (existing.ownerId !== req.userId!) {
    return res.status(403).json({ error: "You can only share your own timeline items" });
  }

  const maxOrder = await prisma.milestone.aggregate({
    where: { projectId: existing.projectId, ownerId: null },
    _max: { order: true },
  });

  const shared = await prisma.milestone.create({
    data: {
      projectId: existing.projectId,
      ownerId: null,
      title: existing.title,
      description: existing.description || `Shared from personal timeline`,
      status: existing.status === "done" ? "done" : "active",
      order: (maxOrder._max.order ?? -1) + 1,
      targetDate: existing.targetDate,
      completedAt: existing.status === "done" ? existing.completedAt ?? new Date() : null,
    },
  });

  await recordActivity({
    projectId: existing.projectId,
    userId: req.userId,
    type: "milestone.shared",
    message: `shared “${existing.title}” with the community`,
    audience: "all",
  });

  res.status(201).json({ milestone: serialize(shared) });
});

milestonesRouter.patch("/milestones/:id", async (req: AuthedRequest, res) => {
  const existing = await prisma.milestone.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Milestone not found" });

  try {
    await assertMember(req.userId!, existing.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const membership = await getMembership(req.userId!, existing.projectId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const isOwn = existing.ownerId === req.userId!;
  const isCommunity = existing.ownerId === null;

  if (isCommunity && !isAdmin) {
    return res.status(403).json({ error: "Only owners and admins can edit the community timeline" });
  }
  if (!isCommunity && !isOwn && !isAdmin) {
    return res.status(403).json({ error: "You can only edit your own timeline" });
  }

  const parsed = z
    .object({
      title: z.string().min(1).max(80).optional(),
      description: z.string().max(500).optional(),
      status: z.enum(["upcoming", "active", "done"]).optional(),
      targetDate: z.string().datetime().optional().nullable(),
      order: z.number().int().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const status = parsed.data.status;
  let completedAt: Date | null | undefined = undefined;
  if (status === "done") completedAt = new Date();
  else if (status === "upcoming" || status === "active") completedAt = null;

  const { targetDate: rawTarget, ...rest } = parsed.data;
  const milestone = await prisma.milestone.update({
    where: { id: existing.id },
    data: {
      ...rest,
      targetDate: rawTarget === undefined ? undefined : rawTarget ? new Date(rawTarget) : null,
      completedAt,
    },
  });

  res.json({ milestone: serialize(milestone) });
});

milestonesRouter.delete("/milestones/:id", async (req: AuthedRequest, res) => {
  const existing = await prisma.milestone.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Milestone not found" });

  try {
    await assertMember(req.userId!, existing.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const membership = await getMembership(req.userId!, existing.projectId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const isOwn = existing.ownerId === req.userId!;
  const isCommunity = existing.ownerId === null;

  if (isCommunity && !isAdmin) {
    return res.status(403).json({ error: "Only owners and admins can edit the community timeline" });
  }
  if (!isCommunity && !isOwn && !isAdmin) {
    return res.status(403).json({ error: "You can only edit your own timeline" });
  }

  await prisma.milestone.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});
