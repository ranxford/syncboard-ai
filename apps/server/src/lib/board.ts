import { emitToProject, emitToUser } from "../realtime/io.js";
import { prisma } from "../prisma.js";
import { parseLabels } from "./labels.js";
import { isAdminRole } from "./teammates.js";

export { parseLabels } from "./labels.js";

/** Full board state for a project: members, columns (ordered) and their tasks (ordered). */
export async function getBoardState(projectId: string) {
  const [project, columns, members] = await Promise.all([
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
    },
    members: members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatarColor: m.user.avatarColor,
      role: m.role,
    })),
    columns: columns.map((c) => ({
      ...c,
      tasks: c.tasks.map((t) => ({ ...t, labels: parseLabels(t.labels) })),
    })),
  };
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
