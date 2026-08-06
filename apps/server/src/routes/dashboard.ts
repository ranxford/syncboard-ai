import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { calls } from "../realtime/calls.js";
import { activeTeammatesFor } from "../realtime/teammateNotify.js";
import { columnIsDone } from "../lib/columns.js";
import {
  alignmentEffectivenessSummary,
  buildAlignmentReport,
  filterAlignmentReportForViewer,
} from "../lib/alignmentReport.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

/** Lightweight project health for the home dashboard. */
dashboardRouter.get("/", async (req: AuthedRequest, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.userId! },
    include: {
      project: {
        include: { _count: { select: { tasks: true, members: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const projects = await Promise.all(
    memberships.map(async (m) => {
      const projectId = m.project.id;
      const columns = await prisma.column.findMany({
        where: { projectId },
        select: { id: true, name: true, order: true },
      });
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

      const isAdmin = m.role === "owner" || m.role === "admin";
      let effectiveness: ReturnType<typeof alignmentEffectivenessSummary> | undefined;
      let myAlignmentStatus: string | undefined;

      if (m.project.visibility === "shared") {
        const built = await buildAlignmentReport(projectId);
        if (built) {
          if (isAdmin) {
            effectiveness = alignmentEffectivenessSummary(built.report);
          } else {
            const mine = filterAlignmentReportForViewer(
              built.report,
              req.userId!,
              false,
            ).collaborators[0];
            myAlignmentStatus = mine?.status;
          }
        }
      }

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
        effectiveness,
        myAlignmentStatus,
      };
    }),
  );

  res.json({
    projects,
    teammates: await activeTeammatesFor(req.userId!),
  });
});
