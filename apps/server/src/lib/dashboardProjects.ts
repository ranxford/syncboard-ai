import { prisma } from "../prisma.js";
import { calls } from "../realtime/calls.js";
import { columnIsDone } from "./columns.js";

export type DashboardProjectSummary = {
  id: string;
  name: string;
  description: string;
  visibility: string;
  field: string;
  role: string;
  taskCount: number;
  memberCount: number;
  createdAt: Date;
  overdueTasks: number;
  stalledTasks: number;
  syncRoomActive: boolean;
};

/** Build one dashboard card for a user's membership (used on invite push). */
export async function buildProjectSummaryForMember(
  userId: string,
  projectId: string,
): Promise<DashboardProjectSummary | null> {
  const m = await prisma.membership.findUnique({
    where: { userId_projectId: { userId, projectId } },
    include: {
      project: {
        include: { _count: { select: { tasks: true, members: true } } },
      },
    },
  });
  if (!m) return null;

  const columns = await prisma.column.findMany({
    where: { projectId },
    select: { id: true, name: true, order: true },
  });
  const now = new Date();
  const maxOrder = columns.length ? Math.max(...columns.map((c) => c.order)) : 0;
  const parkingIds = columns
    .filter(
      (c) =>
        columnIsDone(c.name, c.order, maxOrder, columns.length) ||
        /backlog|ideas|pipeline|intake|requests|exploration|submitted/i.test(c.name),
    )
    .map((c) => c.id);
  const activeColIds = columns.filter((c) => !parkingIds.includes(c.id)).map((c) => c.id);

  const [overdueTasks, stalledTasks] = await Promise.all([
    prisma.task.count({
      where: {
        projectId,
        completedAt: null,
        dueDate: { lt: now },
      },
    }),
    activeColIds.length === 0
      ? Promise.resolve(0)
      : prisma.task.count({
          where: {
            projectId,
            completedAt: null,
            columnId: { in: activeColIds },
            enteredColumnAt: { lt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
          },
        }),
  ]);

  return {
    id: m.project.id,
    name: m.project.name,
    description: m.project.description,
    visibility: m.project.visibility,
    field: m.project.field,
    role: m.role,
    taskCount: m.project._count.tasks,
    memberCount: m.project._count.members,
    createdAt: m.project.createdAt,
    overdueTasks,
    stalledTasks,
    syncRoomActive: calls.list(projectId).length > 0,
  };
}

export async function buildAllProjectSummariesForUser(
  userId: string,
): Promise<DashboardProjectSummary[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      project: {
        include: { _count: { select: { tasks: true, members: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const summaries = await Promise.all(
    memberships.map((m) => buildProjectSummaryForMember(userId, m.projectId)),
  );
  return summaries.filter((s): s is DashboardProjectSummary => s !== null);
}
