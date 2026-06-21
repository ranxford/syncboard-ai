import { prisma } from "../prisma.js";

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
    },
    members: members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatarColor: m.user.avatarColor,
      role: m.role,
    })),
    columns,
  };
}

export async function recordActivity(params: {
  projectId: string;
  userId?: string | null;
  type: string;
  message: string;
  meta?: Record<string, unknown>;
}) {
  return prisma.activity.create({
    data: {
      projectId: params.projectId,
      userId: params.userId ?? null,
      type: params.type,
      message: params.message,
      meta: JSON.stringify(params.meta ?? {}),
    },
  });
}
