/**
 * In-memory presence + "live awareness" store.
 *
 * Tracks which users are connected to which project board, and what each user
 * is currently focused on (e.g. editing a specific task). For multi-instance
 * deployments this can be backed by the Redis adapter; for single-instance dev
 * the in-memory store is sufficient.
 */

export interface PresenceUser {
  userId: string;
  name: string;
  avatarColor: string;
  socketId: string;
  /** id of the task the user is currently viewing/editing, if any */
  focusedTaskId: string | null;
  lastSeen: number;
}

export interface PublicPresence {
  userId: string;
  name: string;
  avatarColor: string;
  focusedTaskId: string | null;
}

class PresenceManager {
  // projectId -> socketId -> PresenceUser
  private rooms = new Map<string, Map<string, PresenceUser>>();

  join(projectId: string, user: PresenceUser): void {
    if (!this.rooms.has(projectId)) {
      this.rooms.set(projectId, new Map());
    }
    this.rooms.get(projectId)!.set(user.socketId, { ...user, lastSeen: Date.now() });
  }

  leaveSocket(socketId: string): string[] {
    const affected: string[] = [];
    for (const [projectId, members] of this.rooms.entries()) {
      if (members.delete(socketId)) {
        affected.push(projectId);
        if (members.size === 0) this.rooms.delete(projectId);
      }
    }
    return affected;
  }

  setFocus(socketId: string, focusedTaskId: string | null): string[] {
    const affected: string[] = [];
    for (const [projectId, members] of this.rooms.entries()) {
      const member = members.get(socketId);
      if (member) {
        member.focusedTaskId = focusedTaskId;
        member.lastSeen = Date.now();
        affected.push(projectId);
      }
    }
    return affected;
  }

  /** De-duplicated list of users present on a board (a user may have multiple tabs). */
  list(projectId: string): PublicPresence[] {
    const members = this.rooms.get(projectId);
    if (!members) return [];
    const byUser = new Map<string, PublicPresence>();
    for (const m of members.values()) {
      const existing = byUser.get(m.userId);
      // prefer the entry that has an active focus
      if (!existing || (m.focusedTaskId && !existing.focusedTaskId)) {
        byUser.set(m.userId, {
          userId: m.userId,
          name: m.name,
          avatarColor: m.avatarColor,
          focusedTaskId: m.focusedTaskId,
        });
      }
    }
    return [...byUser.values()];
  }
}

export const presence = new PresenceManager();
