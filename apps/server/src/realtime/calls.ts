/**
 * In-memory registry of active video-meeting participants per project.
 *
 * The server is a pure WebRTC *signaling* relay — media (audio/video) flows
 * peer-to-peer between browsers and never touches this process. We only track
 * who is in each project's call so newcomers can discover existing peers and
 * everyone can render an accurate roster.
 */

export interface CallParticipant {
  socketId: string;
  userId: string;
  name: string;
  avatarColor: string;
  micOn: boolean;
  camOn: boolean;
  sharingScreen: boolean;
  focusTaskId?: string | null;
  focusTaskTitle?: string | null;
}

export type PublicParticipant = Omit<CallParticipant, never>;

class CallManager {
  // projectId -> socketId -> participant
  private rooms = new Map<string, Map<string, CallParticipant>>();
  // socketId -> projectId (reverse index for fast leave / signal validation)
  private socketProject = new Map<string, string>();

  join(projectId: string, p: CallParticipant): void {
    if (!this.rooms.has(projectId)) this.rooms.set(projectId, new Map());
    this.rooms.get(projectId)!.set(p.socketId, p);
    this.socketProject.set(p.socketId, projectId);
  }

  /** Remove a socket from its call (if any). Returns the affected projectId. */
  leaveSocket(socketId: string): string | null {
    const projectId = this.socketProject.get(socketId);
    if (!projectId) return null;
    this.socketProject.delete(socketId);
    const members = this.rooms.get(projectId);
    if (members) {
      members.delete(socketId);
      if (members.size === 0) this.rooms.delete(projectId);
    }
    return projectId;
  }

  setMedia(
    socketId: string,
    micOn: boolean,
    camOn: boolean,
    sharingScreen: boolean,
  ): CallParticipant | null {
    const projectId = this.socketProject.get(socketId);
    if (!projectId) return null;
    const p = this.rooms.get(projectId)?.get(socketId);
    if (!p) return null;
    p.micOn = micOn;
    p.camOn = camOn;
    p.sharingScreen = sharingScreen;
    return p;
  }

  /** True when both sockets are participants in the same call (signal guard). */
  sameCall(a: string, b: string): boolean {
    const pa = this.socketProject.get(a);
    const pb = this.socketProject.get(b);
    return !!pa && pa === pb;
  }

  projectOf(socketId: string): string | null {
    return this.socketProject.get(socketId) ?? null;
  }

  list(projectId: string): PublicParticipant[] {
    const members = this.rooms.get(projectId);
    return members ? [...members.values()] : [];
  }
}

export const calls = new CallManager();
