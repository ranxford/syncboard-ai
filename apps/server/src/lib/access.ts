import { prisma } from "../prisma.js";

export async function getMembership(userId: string, projectId: string) {
  return prisma.membership.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
}

export async function assertMember(userId: string, projectId: string) {
  const membership = await getMembership(userId, projectId);
  if (!membership) {
    const err = new Error("You are not a member of this project");
    (err as any).status = 403;
    throw err;
  }
  return membership;
}

/** Owner or admin — for invites, role changes, member removal. */
export async function assertCanManageTeam(userId: string, projectId: string) {
  const membership = await assertMember(userId, projectId);
  if (membership.role !== "owner" && membership.role !== "admin") {
    const err = new Error("Only owners and admins can manage the team");
    (err as any).status = 403;
    throw err;
  }
  return membership;
}

export async function assertOwner(userId: string, projectId: string) {
  const membership = await assertMember(userId, projectId);
  if (membership.role !== "owner") {
    const err = new Error("Only the project owner can do that");
    (err as any).status = 403;
    throw err;
  }
  return membership;
}
