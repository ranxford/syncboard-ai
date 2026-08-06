import { prisma } from "../prisma.js";

/** Shared community milestones (ownerId null). */
export const COMMUNITY_MILESTONES = [
  { title: "Kickoff", description: "Scope and alignment", status: "active", order: 0 },
  { title: "Delivery", description: "Main body of work", status: "upcoming", order: 1 },
  { title: "Close-out", description: "Handover and wrap-up", status: "upcoming", order: 2 },
];

/** Each collaborator's unrestricted personal track inside the community. */
export const PERSONAL_MILESTONES = [
  { title: "My plan", description: "What I’m focusing on", status: "active", order: 0 },
  { title: "In motion", description: "Active personal work", status: "upcoming", order: 1 },
  { title: "Wrapped up", description: "Personal close-outs", status: "upcoming", order: 2 },
];

/** Ensure a member has their own timeline inside a community project. */
export async function ensurePersonalTimeline(projectId: string, userId: string) {
  const existing = await prisma.milestone.count({
    where: { projectId, ownerId: userId },
  });
  if (existing > 0) return;

  await prisma.milestone.createMany({
    data: PERSONAL_MILESTONES.map((m) => ({
      projectId,
      ownerId: userId,
      title: m.title,
      description: m.description,
      status: m.status,
      order: m.order,
    })),
  });
}

export function milestoneProgress(milestones: { status: string }[]) {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.status === "done").length;
  return Math.round((done / milestones.length) * 100);
}
