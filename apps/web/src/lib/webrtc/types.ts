export interface CallPeerInfo {
  socketId: string;
  userId: string;
  name: string;
  avatarColor: string;
  micOn: boolean;
  camOn: boolean;
  sharingScreen: boolean;
  /** Task being discussed, when the SyncRoom was started from a task. */
  focusTaskId?: string | null;
  focusTaskTitle?: string | null;
}

export interface Participant extends CallPeerInfo {
  stream: MediaStream | null;
}

/** Messages relayed by the Socket.io signaling server. */
export type SignalMessage =
  | { sdp: RTCSessionDescriptionInit }
  | { candidate: RTCIceCandidateInit };

export type CallPhase = "idle" | "lobby" | "connecting" | "in-call";

export type CallViewMode = "minimized" | "default" | "expanded" | "fullscreen";

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}
