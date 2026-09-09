import { emitToProject, emitToUser } from "../realtime/io.js";
import { prisma } from "../prisma.js";
import { parseLabels } from "./labels.js";
import { isAdminRole } from "./teammates.js";
import { taskVisibleToViewer } from "./taskVisibility.js";

export { parseLabels } from "./labels.js";

export type BoardState = NonNullable<Awaited<ReturnType<typeof getBoardState>>>;

/** Full board state for a project: members, columns (ordered) and their tasks (ordered). */
export async function getBoardState(
  projectId: string,
  opts?: { viewerId?: string },
) {
  const [project, columns, memberships] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.column.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: {
        tasks: {
          orderBy: { order: "asc" },
          include: {
            assignee: { select: { id: true, name: true, avatarColor: true } },
          },
        },
      },
    }),
    prisma.membership.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
    }),
  ]);

  if (!project) return null;

  const viewerMembership = opts?.viewerId
    ? memberships.find((m) => m.userId === opts.viewerId)
    : undefined;
  const viewerRole = viewerMembership?.role;
  const filterForMember = opts?.viewerId && !isAdminRole(viewerRole);

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      visibility: project.visibility,
      field: project.field,
      requirements: project.requirements,
      reviewAnalysis: project.reviewAnalysis,
      reviewAnalysisAt: project.reviewAnalysisAt,
    },
    members: memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatarColor: m.user.avatarColor,
      role: m.role,
      positionKey: m.positionKey,
      positionLabel: m.positionLabel,
      assignedRequirements: m.assignedRequirements,
    })),
    columns: columns.map((c) => ({
      ...c,
      tasks: c.tasks
        .filter((t) =>
          filterForMember
            ? taskVisibleToViewer(t.assigneeId, opts!.viewerId!, viewerRole)
            : true,
        )
        .map((t) => ({ ...t, labels: parseLabels(t.labels) })),
    })),
  };
}

/** Push a per-user filtered board snapshot after mutations (members don't see peers' assigned tasks). */
export async function broadcastBoardUpdate(projectId: string) {
  const members = await prisma.membership.findMany({
    where: { projectId },
    select: { userId: true },
  });
  await Promise.all(
    members.map(async (m) => {
      const board = await getBoardState(projectId, { viewerId: m.userId });
      if (board) {
        emitToUser(m.userId, "board:updated", { projectId, board });
      }
    }),
  );
}

export async function recordActivity(params: {
  projectId: string;
  userId?: string | null;
  type: string;
  message: string;
  meta?: Record<string, unknown>;
  /** When "admins", only owners/admins receive the live activity event. */
  audience?: "all" | "admins";
}) {
  const meta = { ...(params.meta ?? {}), audience: params.audience ?? "all" };
  const activity = await prisma.activity.create({
    data: {
      projectId: params.projectId,
      userId: params.userId ?? null,
      type: params.type,
      message: params.message,
      meta: JSON.stringify(meta),
    },
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
  });

  const payload = {
    activity: {
      id: activity.id,
      type: activity.type,
      message: activity.message,
      meta: JSON.parse(activity.meta || "{}"),
      createdAt: activity.createdAt,
      user: activity.user,
    },
  };

  if (params.audience === "admins") {
    const admins = await prisma.membership.findMany({
      where: {
        projectId: params.projectId,
        role: { in: ["owner", "admin"] },
      },
      select: { userId: true },
    });
    for (const a of admins) {
      emitToUser(a.userId, "activity:created", payload);
    }
  } else {
    emitToProject(params.projectId, "activity:created", payload);
  }

  return activity;
}

/** Whether a stored activity row should be shown to this viewer. */
export function activityVisibleToViewer(
  metaRaw: string,
  viewerRole: string | undefined,
  viewerId: string,
  activityUserId: string | null,
): boolean {
  let meta: { audience?: string } = {};
  try {
    meta = JSON.parse(metaRaw || "{}");
  } catch {
    meta = {};
  }
  if (meta.audience === "admins") {
    return isAdminRole(viewerRole) || activityUserId === viewerId;
  }
  return true;
}
