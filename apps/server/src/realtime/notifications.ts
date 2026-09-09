import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { emitToUser } from "./io.js";
import { buildProjectSummaryForMember } from "../lib/dashboardProjects.js";
import {
  sendAlignmentAssignedEmail,
  sendProjectAddedEmail,
  sendSyncRoomRecapEmail,
  sendSyncRoomStartedEmail,
} from "../lib/email.js";

export type AppNotification = {
  type: "project.added" | "project.invited" | "syncroom.started" | "alignment.assigned";
  message: string;
  projectId: string;
  projectName: string;
  boardUrl: string;
  starterName?: string;
  taskTitle?: string | null;
  positionLabel?: string;
  assignedRequirements?: string;
};

export function notifyUser(userId: string, notification: AppNotification): void {
  emitToUser(userId, "notification", notification);
  emitToUser(userId, "dashboard:updated", { reason: notification.type, projectId: notification.projectId });
}

function boardUrl(projectId: string): string {
  return `${env.webOrigin}/board/${projectId}`;
}

/** Tell a user they were added to a project (existing account). */
export async function notifyProjectAdded(params: {
  userId: string;
  projectId: string;
  projectName: string;
  inviterName: string;
}): Promise<void> {
  const url = boardUrl(params.projectId);
  notifyUser(params.userId, {
    type: "project.added",
    projectId: params.projectId,
    projectName: params.projectName,
    boardUrl: url,
    message: `${params.inviterName} added you to “${params.projectName}”`,
  });

  const project = await buildProjectSummaryForMember(params.userId, params.projectId);
  if (project) {
    emitToUser(params.userId, "dashboard:project-added", { project });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true, name: true },
  });
  if (user) {
    void sendProjectAddedEmail({
      to: user.email,
      recipientName: user.name,
      projectName: params.projectName,
      inviterName: params.inviterName,
      boardUrl: url,
    });
  }
}

/** Tell a collaborator their review role/criteria were assigned or updated. */
export async function notifyAlignmentAssigned(params: {
  userId: string;
  projectId: string;
  projectName: string;
  adminName: string;
  positionLabel: string;
  assignedRequirements: string;
}): Promise<void> {
  const label = params.positionLabel ? ` as ${params.positionLabel}` : "";
  const criteriaPreview = params.assignedRequirements.trim().slice(0, 120);
  const criteriaSuffix = criteriaPreview
    ? `: ${criteriaPreview}${params.assignedRequirements.length > 120 ? "…" : ""}`
    : "";
  const url = boardUrl(params.projectId);

  notifyUser(params.userId, {
    type: "alignment.assigned",
    projectId: params.projectId,
    projectName: params.projectName,
    boardUrl: url,
    positionLabel: params.positionLabel,
    assignedRequirements: params.assignedRequirements,
    message: `${params.adminName} set your review criteria${label} on “${params.projectName}”${criteriaSuffix}`,
  });
  emitToUser(params.userId, "alignment:updated", { projectId: params.projectId });

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true, name: true },
  });
  if (user) {
    void sendAlignmentAssignedEmail({
      to: user.email,
      recipientName: user.name,
      projectName: params.projectName,
      adminName: params.adminName,
      positionLabel: params.positionLabel,
      assignedRequirements: params.assignedRequirements,
      boardUrl: url,
    });
  }
}

/** Tell project members a SyncRoom session just started. */
export async function notifySyncRoomStarted(params: {
  projectId: string;
  projectName: string;
  starterId: string;
  starterName: string;
  taskTitle?: string | null;
}): Promise<void> {
  const members = await prisma.membership.findMany({
    where: { projectId: params.projectId, userId: { not: params.starterId } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const task = params.taskTitle ? ` on “${params.taskTitle}”` : "";
  const message = `${params.starterName} started a SyncRoom in “${params.projectName}”${task}`;
  const url = boardUrl(params.projectId);

  for (const m of members) {
    notifyUser(m.userId, {
      type: "syncroom.started",
      projectId: params.projectId,
      projectName: params.projectName,
      boardUrl: url,
      starterName: params.starterName,
      taskTitle: params.taskTitle ?? null,
      message,
    });

    void sendSyncRoomStartedEmail({
      to: m.user.email,
      recipientName: m.user.name,
      projectName: params.projectName,
      starterName: params.starterName,
      taskTitle: params.taskTitle ?? null,
      boardUrl: url,
    });
  }
}

/** Email all members the AI SyncRoom recap (after wrap-up saves a summary). */
export async function notifySyncRoomRecap(params: {
  projectId: string;
  sessionId: string;
}): Promise<void> {
  const session = await prisma.syncRoomSession.findUnique({
    where: { id: params.sessionId },
    select: {
      startedAt: true,
      endedAt: true,
      contextTaskTitle: true,
      summary: true,
      notes: true,
      decisions: true,
      project: { select: { name: true } },
    },
  });
  if (!session?.summary?.trim()) return;

  const endedAt = session.endedAt ?? new Date();
  const durationMinutes = Math.max(
    1,
    Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60_000),
  );
  const decisions = JSON.parse(session.decisions || "[]") as string[];

  const members = await prisma.membership.findMany({
    where: { projectId: params.projectId },
    include: { user: { select: { name: true, email: true } } },
  });

  const url = boardUrl(params.projectId);
  for (const m of members) {
    void sendSyncRoomRecapEmail({
      to: m.user.email,
      recipientName: m.user.name,
      projectName: session.project.name,
      taskTitle: session.contextTaskTitle,
      summary: session.summary,
      notes: session.notes,
      decisions,
      boardUrl: url,
      durationMinutes,
    });
  }
}
