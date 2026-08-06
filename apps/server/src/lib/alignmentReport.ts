import { prisma } from "../prisma.js";
import { getBoardState } from "./board.js";
import {
  analyzeCollaboratorAlignment,
  type AlignmentReport,
} from "../ai/alignment.js";
import { enrichAlignmentWithFeedback } from "../ai/alignmentFeedback.js";
import { resolveMemberBrief } from "./alignmentPositions.js";

export type AlignmentBuildResult = {
  report: AlignmentReport;
  projectField: string;
  board: NonNullable<Awaited<ReturnType<typeof getBoardState>>>;
  memberships: {
    userId: string;
    role: string;
    positionKey: string;
    positionLabel: string;
    assignedRequirements: string;
    user: { name: string; avatarColor: string; email: string };
  }[];
  tasksByAssignee: Map<
    string,
    { id: string; title: string; description: string; completedAt: Date | null }[]
  >;
  milestonesByOwner: Map<string, { title: string; description: string; status: string }[]>;
};

export async function buildAlignmentReport(
  projectId: string,
  options?: { withAiFeedback?: boolean },
): Promise<AlignmentBuildResult | null> {
  const [project, board, tasks, milestones, memberships] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { requirements: true, description: true, field: true },
    }),
    getBoardState(projectId),
    prisma.task.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        description: true,
        assigneeId: true,
        completedAt: true,
      },
    }),
    prisma.milestone.findMany({
      where: { projectId, ownerId: { not: null } },
      select: { ownerId: true, title: true, description: true, status: true },
    }),
    prisma.membership.findMany({
      where: { projectId },
      select: {
        userId: true,
        role: true,
        positionKey: true,
        positionLabel: true,
        assignedRequirements: true,
        user: { select: { name: true, avatarColor: true, email: true } },
      },
    }),
  ]);

  if (!project || !board) return null;

  const projectField = project.field || "general";
  const requirements =
    project.requirements.trim() || project.description.trim() || "";

  const tasksByAssignee = new Map<
    string,
    { id: string; title: string; description: string; completedAt: Date | null }[]
  >();
  for (const t of tasks) {
    if (!t.assigneeId) continue;
    const list = tasksByAssignee.get(t.assigneeId) ?? [];
    list.push(t);
    tasksByAssignee.set(t.assigneeId, list);
  }

  const milestonesByOwner = new Map<
    string,
    { title: string; description: string; status: string }[]
  >();
  for (const m of milestones) {
    if (!m.ownerId) continue;
    const list = milestonesByOwner.get(m.ownerId) ?? [];
    list.push({ title: m.title, description: m.description, status: m.status });
    milestonesByOwner.set(m.ownerId, list);
  }

  const memberBriefs = new Map<
    string,
    { positionKey?: string; positionLabel?: string; assignedRequirements?: string }
  >();
  for (const m of memberships) {
    if (m.role !== "member") continue;
    const resolved = resolveMemberBrief({
      field: projectField,
      positionKey: m.positionKey,
      positionLabel: m.positionLabel,
      assignedRequirements: m.assignedRequirements,
    });
    memberBriefs.set(m.userId, resolved);
  }

  let report = analyzeCollaboratorAlignment({
    projectRequirements: requirements,
    memberBriefs,
    members: board.members.map((m) => ({
      id: m.id,
      name: m.name,
      avatarColor: m.avatarColor,
      role: m.role,
    })),
    tasksByAssignee,
    milestonesByOwner,
  });

  if (options?.withAiFeedback !== false) {
    const openTasks = new Map<string, { title: string; description: string }[]>();
    for (const [uid, list] of tasksByAssignee) {
      openTasks.set(
        uid,
        list.filter((t) => !t.completedAt).map((t) => ({ title: t.title, description: t.description })),
      );
    }
    report = await enrichAlignmentWithFeedback(report, openTasks, milestonesByOwner);
  }

  return { report, projectField, board, memberships, tasksByAssignee, milestonesByOwner };
}

export function filterAlignmentReportForViewer(
  report: AlignmentReport,
  userId: string,
  isAdmin: boolean,
): AlignmentReport {
  if (isAdmin) return report;
  return {
    ...report,
    collaborators: report.collaborators.filter((c) => c.userId === userId),
  };
}

export function listMemberAssignments(
  field: string,
  memberships: {
    userId: string;
    role: string;
    positionKey: string;
    positionLabel: string;
    assignedRequirements: string;
    user: { name: string; avatarColor: string; email: string };
  }[],
) {
  return memberships
    .filter((m) => m.role === "member")
    .map((m) => {
      const resolved = resolveMemberBrief({
        field,
        positionKey: m.positionKey,
        positionLabel: m.positionLabel,
        assignedRequirements: m.assignedRequirements,
      });
      return {
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        avatarColor: m.user.avatarColor,
        role: m.role,
        positionKey: resolved.positionKey,
        positionLabel: resolved.positionLabel,
        assignedRequirements: resolved.assignedRequirements,
      };
    });
}

export function alignmentEffectivenessSummary(report: AlignmentReport) {
  const members = report.collaborators;
  return {
    hasBrief: report.hasBrief,
    aligned: members.filter((c) => c.status === "aligned").length,
    drifting: members.filter((c) => c.status === "drifting").length,
    offTrack: members.filter((c) => c.status === "off_track").length,
    needsBrief: !report.hasBrief,
  };
}
