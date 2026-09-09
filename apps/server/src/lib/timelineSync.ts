import { prisma } from "../prisma.js";

/** Board-level done ratio for the whole project. */
export async function communityTaskProgressPct(projectId: string): Promise<number> {
  const [total, done] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, completedAt: { not: null } } }),
  ]);
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

/** Done ratio for tasks assigned to a specific member. */
export async function memberTaskProgressPct(projectId: string, userId: string): Promise<number> {
  const [total, done] = await Promise.all([
    prisma.task.count({ where: { projectId, assigneeId: userId } }),
    prisma.task.count({ where: { projectId, assigneeId: userId, completedAt: { not: null } } }),
  ]);
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

/** Hook after task mutations — reserved for future milestone auto-sync. */
export async function syncTimelinesFromTasks(
  _projectId: string,
  _assigneeIds?: (string | null | undefined)[],
): Promise<void> {
  /* no-op — progress is computed on read */
}
