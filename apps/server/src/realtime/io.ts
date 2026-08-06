import type { Server } from "socket.io";

let io: Server | null = null;

export function setIo(server: Server): void {
  io = server;
}

export function roomFor(projectId: string): string {
  return `project:${projectId}`;
}

/** Socket.io room for a project's live video meeting (signaling fan-out). */
export function callRoomFor(projectId: string): string {
  return `call:${projectId}`;
}

/** Per-user room for cross-project teammate alerts. */
export function userRoomFor(userId: string): string {
  return `user:${userId}`;
}

/** Push an event to every socket owned by a user (dashboard, boards, etc.). */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userRoomFor(userId)).emit(event, payload);
}

/** Broadcast an event to everyone viewing a project board. */
export function emitToProject(projectId: string, event: string, payload: unknown): void {
  io?.to(roomFor(projectId)).emit(event, payload);
}
