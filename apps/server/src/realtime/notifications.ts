import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { emitToUser } from "./io.js";

export type AppNotification = {
  type: "project.added" | "project.invited" | "syncroom.started";
  message: string;
  projectId: string;
  projectName: string;
  boardUrl: string;
  starterName?: string;
  taskTitle?: string | null;
};

export function notifyUser(userId: string, notification: AppNotification): void {
  emitToUser(userId, "notification", notification);
}

function boardUrl(projectId: string): string {
  return `${env.webOrigin}/board/${projectId}`;
}

/** Tell a user they were added to a project (existing account). */
export function notifyProjectAdded(params: {
  userId: string;
  projectId: string;
  projectName: string;
  inviterName: string;
}): void {
  notifyUser(params.userId, {
    type: "project.added",
    projectId: params.projectId,
    projectName: params.projectName,
    boardUrl: boardUrl(params.projectId),
    message: `${params.inviterName} added you to “${params.projectName}”`,
  });
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
    select: { userId: true },
  });

  const task = params.taskTitle ? ` on “${params.taskTitle}”` : "";
  const message = `${params.starterName} started a SyncRoom in “${params.projectName}”${task}`;

  for (const m of members) {
    notifyUser(m.userId, {
      type: "syncroom.started",
      projectId: params.projectId,
      projectName: params.projectName,
      boardUrl: boardUrl(params.projectId),
      starterName: params.starterName,
      taskTitle: params.taskTitle ?? null,
      message,
    });
  }
}
