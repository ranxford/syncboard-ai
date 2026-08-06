import { prisma } from "../prisma.js";

export function isAdminRole(role: string | undefined | null): boolean {
  return role === "owner" || role === "admin";
}

/** User IDs that share at least one project with `userId` (excluding self). */
export async function getCoMemberIds(userId: string): Promise<string[]> {
  const myProjects = await prisma.membership.findMany({
    where: { userId },
    select: { projectId: true },
  });
  if (myProjects.length === 0) return [];

  const projectIds = myProjects.map((m) => m.projectId);
  const coMembers = await prisma.membership.findMany({
    where: { projectId: { in: projectIds }, userId: { not: userId } },
    select: { userId: true },
    distinct: ["userId"],
  });

  return coMembers.map((m) => m.userId);
}

/**
 * People who may oversee `userId`'s live work: owners/admins on any
 * project they share. Regular members do not receive peer oversight.
 */
export async function getAdminViewerIdsFor(userId: string): Promise<string[]> {
  const myProjects = await prisma.membership.findMany({
    where: { userId },
    select: { projectId: true },
  });
  if (myProjects.length === 0) return [];

  const projectIds = myProjects.map((m) => m.projectId);
  const admins = await prisma.membership.findMany({
    where: {
      projectId: { in: projectIds },
      userId: { not: userId },
      role: { in: ["owner", "admin"] },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  return admins.map((m) => m.userId);
}

/**
 * Collaborators whose live work `viewerId` may oversee (projects where
 * the viewer is owner/admin). Empty for plain members.
 */
export async function getOverseenUserIds(viewerId: string): Promise<string[]> {
  const adminProjects = await prisma.membership.findMany({
    where: { userId: viewerId, role: { in: ["owner", "admin"] } },
    select: { projectId: true },
  });
  if (adminProjects.length === 0) return [];

  const projectIds = adminProjects.map((m) => m.projectId);
  const members = await prisma.membership.findMany({
    where: { projectId: { in: projectIds }, userId: { not: viewerId } },
    select: { userId: true },
    distinct: ["userId"],
  });

  return members.map((m) => m.userId);
}

/** Project IDs shared between two users. */
export async function getSharedProjectIds(a: string, b: string): Promise<string[]> {
  const [aProjects, bProjects] = await Promise.all([
    prisma.membership.findMany({ where: { userId: a }, select: { projectId: true } }),
    prisma.membership.findMany({ where: { userId: b }, select: { projectId: true } }),
  ]);
  const bSet = new Set(bProjects.map((m) => m.projectId));
  return aProjects.map((m) => m.projectId).filter((id) => bSet.has(id));
}
