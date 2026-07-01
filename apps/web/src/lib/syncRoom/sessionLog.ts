export interface TaskContext {
  id: string;
  title: string;
}

export type SessionEventKind =
  | "session_started"
  | "peer_joined"
  | "peer_left"
  | "screen_shared"
  | "screen_stopped"
  | "session_ended";

export interface SessionEvent {
  id: string;
  kind: SessionEventKind;
  at: string;
  label: string;
}

export function newSessionEvent(kind: SessionEventKind, label: string): SessionEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    at: new Date().toISOString(),
    label,
  };
}
