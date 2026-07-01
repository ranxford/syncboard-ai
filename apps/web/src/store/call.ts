import { create } from "zustand";
import { listMediaDevices, openLocalMedia, openScreenShare } from "@/lib/webrtc/mediaDevices";
import { PeerMesh } from "@/lib/webrtc/peerMesh";
import {
  bindCallSignaling,
  emitCallJoin,
  emitCallLeave,
  emitCallMedia,
  emitCallSignal,
} from "@/lib/webrtc/signaling";
import type {
  CallPeerInfo,
  CallPhase,
  CallViewMode,
  MediaDeviceOption,
  Participant,
} from "@/lib/webrtc/types";
import { newSessionEvent, type SessionEvent, type TaskContext } from "@/lib/syncRoom/sessionLog";
import { toast } from "@/store/toast";

// Re-export types used by components.
export type { CallPeerInfo, Participant, CallPhase, CallViewMode, SessionEvent, TaskContext };

interface CallState {
  projectId: string | null;
  phase: CallPhase;
  viewMode: CallViewMode;
  localStream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  sharingScreen: boolean;
  participants: Participant[];
  roster: CallPeerInfo[];
  cameras: MediaDeviceOption[];
  mics: MediaDeviceOption[];
  cameraId: string;
  micId: string;
  /** When set, this SyncRoom is anchored to a specific task discussion. */
  contextTask: TaskContext | null;
  sessionLog: SessionEvent[];
  wrapUpOpen: boolean;

  observe: (projectId: string) => void;
  unobserve: () => void;
  openLobby: (opts?: { task?: TaskContext }) => Promise<void>;
  closeLobby: () => void;
  setCameraId: (id: string) => Promise<void>;
  setMicId: (id: string) => Promise<void>;
  join: (opts?: { video?: boolean }) => Promise<void>;
  leave: () => void;
  dismissWrapUp: () => void;
  logSession: (kind: SessionEvent["kind"], label: string) => void;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleScreen: () => Promise<void>;
  setViewMode: (mode: CallViewMode) => void;
  copyInviteLink: () => Promise<void>;
}

let mesh: PeerMesh | null = null;
let savedCameraTrack: MediaStreamTrack | null = null;

function getMesh(): PeerMesh {
  if (!mesh) {
    mesh = new PeerMesh(
      (to, message) => emitCallSignal(to, message),
      (socketId, stream) => {
        useCall.setState((s) => ({
          participants: s.participants.map((p) =>
            p.socketId === socketId ? { ...p, stream } : p,
          ),
        }));
      },
      (socketId) => {
        useCall.setState((s) => ({
          participants: s.participants.filter((p) => p.socketId !== socketId),
        }));
      },
    );
  }
  return mesh;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

function upsertParticipant(info: CallPeerInfo, stream?: MediaStream | null) {
  useCall.setState((s) => {
    const hit = s.participants.find((p) => p.socketId === info.socketId);
    if (hit) {
      return {
        participants: s.participants.map((p) =>
          p.socketId === info.socketId
            ? { ...p, ...info, stream: stream !== undefined ? stream : p.stream }
            : p,
        ),
      };
    }
    return { participants: [...s.participants, { ...info, stream: stream ?? null }] };
  });
}

function publishMedia() {
  if (useCall.getState().phase !== "in-call") return;
  const { micOn, camOn, sharingScreen } = useCall.getState();
  emitCallMedia(micOn, camOn, sharingScreen);
}

function teardown() {
  getMesh().closeAll();
  const { localStream } = useCall.getState();
  stopStream(localStream);
  savedCameraTrack?.stop();
  savedCameraTrack = null;
}

function appendLog(kind: SessionEvent["kind"], label: string) {
  useCall.setState((s) => ({
    sessionLog: [...s.sessionLog, newSessionEvent(kind, label)],
  }));
}

bindCallSignaling({
  projectId: () => useCall.getState().projectId,
  isInCall: () => useCall.getState().phase === "in-call",
  onRoster: (_projectId, participants) =>
    useCall.setState({
      roster: participants.map((p) => ({ ...p, sharingScreen: p.sharingScreen ?? false })),
    }),
  onPeerJoined: (peer) => {
    getMesh().rememberPeer(peer);
    if (useCall.getState().phase === "in-call") {
      appendLog("peer_joined", `${peer.name} joined`);
    }
  },
  onPeerLeft: (socketId) => {
    const name = useCall.getState().participants.find((p) => p.socketId === socketId)?.name ?? "Someone";
    getMesh().dropPeer(socketId);
    appendLog("peer_left", `${name} left`);
  },
  onPeerMedia: (socketId, micOn, camOn, sharingScreen) => {
    useCall.setState((s) => ({
      participants: s.participants.map((p) =>
        p.socketId === socketId ? { ...p, micOn, camOn, sharingScreen } : p,
      ),
      roster: s.roster.map((p) =>
        p.socketId === socketId ? { ...p, micOn, camOn, sharingScreen } : p,
      ),
    }));
  },
  onSignal: (from, message) => void getMesh().handleSignal(from, message),
});

export const useCall = create<CallState>((set, get) => ({
  projectId: null,
  phase: "idle",
  viewMode: "default",
  localStream: null,
  micOn: true,
  camOn: true,
  sharingScreen: false,
  participants: [],
  roster: [],
  cameras: [],
  mics: [],
  cameraId: "",
  micId: "",
  contextTask: null,
  sessionLog: [],
  wrapUpOpen: false,

  observe: (projectId) => set({ projectId }),

  logSession: (kind, label) => appendLog(kind, label),

  unobserve: () => {
    if (get().phase === "in-call") get().leave();
    if (get().phase === "lobby") get().closeLobby();
    set({ projectId: null, roster: [], wrapUpOpen: false });
  },

  openLobby: async (opts) => {
    if (!get().projectId || get().phase !== "idle") return;
    const task = opts?.task ?? null;
    const started = newSessionEvent(
      "session_started",
      task ? `SyncRoom opened for “${task.title}”` : "Project SyncRoom opened",
    );
    set({
      phase: "lobby",
      viewMode: "expanded",
      contextTask: task,
      sessionLog: [started],
    });

    try {
      const stream = await openLocalMedia({ video: true, audio: true });
      const { cameras, mics } = await listMediaDevices();
      set({
        localStream: stream,
        cameras,
        mics,
        cameraId: stream.getVideoTracks()[0]?.getSettings().deviceId ?? cameras[0]?.deviceId ?? "",
        micId: stream.getAudioTracks()[0]?.getSettings().deviceId ?? mics[0]?.deviceId ?? "",
        micOn: true,
        camOn: true,
      });
      getMesh().setLocalStream(stream);
    } catch {
      set({ phase: "idle" });
      toast.error("Allow camera and microphone access to join the SyncRoom.");
    }
  },

  closeLobby: () => {
    teardown();
    set({
      phase: "idle",
      localStream: null,
      viewMode: "default",
      sharingScreen: false,
      participants: [],
      contextTask: null,
      sessionLog: [],
    });
  },

  setCameraId: async (id) => {
    const { localStream, micId, micOn } = get();
    stopStream(localStream);
    const stream = await openLocalMedia({ video: true, audio: micOn, cameraId: id, micId });
    set({ localStream: stream, cameraId: id, camOn: true });
    getMesh().setLocalStream(stream);
  },

  setMicId: async (id) => {
    const { localStream, cameraId, camOn } = get();
    stopStream(localStream);
    const stream = await openLocalMedia({ video: camOn, audio: true, cameraId, micId: id });
    set({ localStream: stream, micId: id, micOn: true });
    getMesh().setLocalStream(stream);
  },

  join: async (opts) => {
    const { projectId, phase, contextTask } = get();
    if (!projectId || (phase !== "lobby" && phase !== "idle")) return;

    const wantVideo = opts?.video ?? true;
    set({ phase: "connecting", camOn: wantVideo });

    let stream = get().localStream;
    if (!stream || phase === "idle") {
      try {
        stream = await openLocalMedia({
          video: wantVideo,
          audio: true,
          cameraId: get().cameraId || undefined,
          micId: get().micId || undefined,
        });
        set({ localStream: stream });
      } catch {
        set({ phase: "lobby" });
        toast.error("Couldn't access your microphone.");
        return;
      }
    }

    if (!wantVideo) stream.getVideoTracks().forEach((t) => (t.enabled = false));

    getMesh().setLocalStream(stream);
    set({ micOn: true, sharingScreen: false, viewMode: "expanded" });

    emitCallJoin(
      projectId,
      {
        micOn: true,
        camOn: wantVideo,
        focusTaskId: contextTask?.id ?? null,
        focusTaskTitle: contextTask?.title ?? null,
      },
      (res) => {
      if ("error" in res) {
        set({ phase: "lobby" });
        toast.error("Couldn't join the SyncRoom.");
        return;
      }

      set({ phase: "in-call" });
      for (const peer of res.peers) {
        getMesh().rememberPeer(peer);
        upsertParticipant(peer);
        void getMesh().offerTo(peer.socketId);
      }
      publishMedia();
      toast.success(contextTask ? `Live discussion started on “${contextTask.title}”.` : "You're in the SyncRoom.");
    },
    );
  },

  leave: () => {
    if (get().phase === "idle" && !get().wrapUpOpen) return;
    if (get().phase !== "idle") {
      emitCallLeave();
      appendLog("session_ended", "You left the SyncRoom");
    }
    teardown();
    set({
      phase: "idle",
      localStream: null,
      participants: [],
      sharingScreen: false,
      viewMode: "default",
      wrapUpOpen: true,
    });
  },

  dismissWrapUp: () =>
    set({
      wrapUpOpen: false,
      sessionLog: [],
      contextTask: null,
    }),

  toggleMic: () => {
    const { localStream, micOn } = get();
    const next = !micOn;
    localStream?.getAudioTracks().forEach((t) => (t.enabled = next));
    set({ micOn: next });
    publishMedia();
  },

  toggleCam: () => {
    const { localStream, camOn, sharingScreen } = get();
    if (sharingScreen) return;
    const next = !camOn;
    localStream?.getVideoTracks().forEach((t) => (t.enabled = next));
    set({ camOn: next });
    publishMedia();
  },

  toggleScreen: async () => {
    const { sharingScreen, localStream } = get();
    if (!localStream) return;

    if (!sharingScreen) {
      let display: MediaStream;
      try {
        display = await openScreenShare();
      } catch {
        return;
      }
      const screenTrack = display.getVideoTracks()[0];
      savedCameraTrack = localStream.getVideoTracks()[0] ?? null;
      if (savedCameraTrack) localStream.removeTrack(savedCameraTrack);
      localStream.addTrack(screenTrack);
      await getMesh().startScreenShare(screenTrack);
      set({ sharingScreen: true, localStream, camOn: true });
      appendLog("screen_shared", "You started screen sharing");
      publishMedia();
      screenTrack.onended = () => void get().toggleScreen();
    } else {
      const screenTrack = localStream.getVideoTracks()[0];
      if (screenTrack) {
        localStream.removeTrack(screenTrack);
        screenTrack.stop();
      }
      if (savedCameraTrack) {
        localStream.addTrack(savedCameraTrack);
        await getMesh().stopScreenShare();
        savedCameraTrack = null;
      }
      set({ sharingScreen: false, localStream });
      appendLog("screen_stopped", "Screen sharing stopped");
      publishMedia();
    }
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  copyInviteLink: async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("SyncRoom link copied — teammates on this board can join.");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  },
}));

/** User-facing alias — SyncRoom is context-aware collaboration, not generic video chat. */
export const useSyncRoom = useCall;
