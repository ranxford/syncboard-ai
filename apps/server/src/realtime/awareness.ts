/**
 * Cross-project teammate awareness — not one global community.
 * Each user sees live status of people they share a project with.
 */

export interface TeammateStatus {
  userId: string;
  name: string;
  avatarColor: string;
  projectId: string | null;
  projectName: string | null;
  focusedTaskId: string | null;
  focusTaskTitle: string | null;
  inSyncRoom: boolean;
  syncRoomTaskTitle: string | null;
}

interface AwarenessState {
  userId: string;
  name: string;
  avatarColor: string;
  projectId: string | null;
  projectName: string | null;
  focusedTaskId: string | null;
  focusTaskTitle: string | null;
  inSyncRoom: boolean;
  syncRoomTaskTitle: string | null;
}

class AwarenessManager {
  // socketId -> userId
  private sockets = new Map<string, string>();
  // userId -> merged state
  private byUser = new Map<string, AwarenessState>();

  connect(socketId: string, user: { id: string; name: string; avatarColor: string }) {
    this.sockets.set(socketId, user.id);
    if (!this.byUser.has(user.id)) {
      this.byUser.set(user.id, {
        userId: user.id,
        name: user.name,
        avatarColor: user.avatarColor,
        projectId: null,
        projectName: null,
        focusedTaskId: null,
        focusTaskTitle: null,
        inSyncRoom: false,
        syncRoomTaskTitle: null,
      });
    }
  }

  disconnect(socketId: string): string | null {
    const userId = this.sockets.get(socketId);
    if (!userId) return null;
    this.sockets.delete(socketId);
    const stillOnline = [...this.sockets.values()].some((id) => id === userId);
    if (!stillOnline) {
      this.byUser.delete(userId);
    }
    return userId;
  }

  setBoard(
    userId: string,
    project: { id: string; name: string } | null,
  ) {
    const entry = this.byUser.get(userId);
    if (!entry) return;
    entry.projectId = project?.id ?? null;
    entry.projectName = project?.name ?? null;
    if (!project) {
      entry.focusedTaskId = null;
      entry.focusTaskTitle = null;
      entry.inSyncRoom = false;
      entry.syncRoomTaskTitle = null;
    }
  }

  setFocus(userId: string, task: { id: string; title: string } | null) {
    const entry = this.byUser.get(userId);
    if (!entry) return;
    entry.focusedTaskId = task?.id ?? null;
    entry.focusTaskTitle = task?.title ?? null;
  }

  setSyncRoom(
    userId: string,
    active: boolean,
    taskTitle: string | null = null,
  ) {
    const entry = this.byUser.get(userId);
    if (!entry) return;
    entry.inSyncRoom = active;
    entry.syncRoomTaskTitle = active ? taskTitle : null;
  }

  get(userId: string): TeammateStatus | null {
    const e = this.byUser.get(userId);
    if (!e) return null;
    return { ...e };
  }

  /** Teammates with something worth showing (on a board or in SyncRoom). */
  listActive(userIds: string[]): TeammateStatus[] {
    const out: TeammateStatus[] = [];
    for (const id of userIds) {
      const s = this.get(id);
      if (!s) continue;
      if (s.projectId || s.inSyncRoom) out.push(s);
    }
    return out;
  }
}

export const awareness = new AwarenessManager();
