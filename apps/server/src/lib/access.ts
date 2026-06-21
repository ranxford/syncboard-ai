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
