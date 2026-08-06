import { create } from "zustand";
import { listMediaDevices, openLocalMedia, openScreenShare, findMobileCamera, findMobileMic } from "@/lib/webrtc/mediaDevices";
import { cameraTrackFromStream, screenTrackFromStream } from "@/lib/webrtc/trackUtils";
import { PeerMesh } from "@/lib/webrtc/peerMesh";
import {
  bindCallSignaling,
  emitCallJoin,
  emitCallLeave,
  emitCallMedia,
  emitCallNotes,
  emitCallWhiteboard,
  emitCallSessionEvent,
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

export interface WhiteboardStroke {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}
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
  speakers: MediaDeviceOption[];
  cameraId: string;
  micId: string;
  speakerId: string;
  /** When set, this SyncRoom is anchored to a specific task discussion. */
  contextTask: TaskContext | null;
  sessionId: string | null;
  sessionLog: SessionEvent[];
  collaborativeNotes: string;
  whiteboardStrokes: WhiteboardStroke[];
  wrapUpOpen: boolean;

  observe: (projectId: string) => void;
  unobserve: () => void;
  openLobby: (opts?: { task?: TaskContext }) => Promise<void>;
  closeLobby: () => void;
  setCameraId: (id: string) => Promise<void>;
  setMicId: (id: string) => Promise<void>;
  setSpeakerId: (id: string) => void;
  join: (opts?: { video?: boolean }) => Promise<void>;
  leave: () => void;
  dismissWrapUp: () => void;
  logSession: (kind: SessionEvent["kind"], label: string) => void;
  setCollaborativeNotes: (notes: string) => void;
  setWhiteboardStrokes: (strokes: WhiteboardStroke[]) => void;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleScreen: () => Promise<void>;
  refreshDevices: () => Promise<{ cameras: MediaDeviceOption[]; mics: MediaDeviceOption[]; speakers: MediaDeviceOption[] }>;
  useMobileCamera: () => Promise<boolean>;
  useMobileMic: () => Promise<boolean>;
  /** @deprecated use useMobileCamera */
  usePhoneCamera: () => Promise<boolean>;
  setViewMode: (mode: CallViewMode) => void;
  copyInviteLink: () => Promise<void>;
}

let mesh: PeerMesh | null = null;
let savedCameraTrack: MediaStreamTrack | null = null;
let deviceChangeHandler: (() => void) | null = null;

function watchDevices(onChange: () => void) {
  if (!navigator.mediaDevices || deviceChangeHandler) return;
  deviceChangeHandler = () => onChange();
  navigator.mediaDevices.addEventListener("devicechange", deviceChangeHandler);
}

function unwatchDevices() {
  if (deviceChangeHandler && navigator.mediaDevices) {
    navigator.mediaDevices.removeEventListener("devicechange", deviceChangeHandler);
    deviceChangeHandler = null;
  }
}

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

function appendLog(kind: SessionEvent["kind"], label: string, opts?: { remote?: boolean; id?: string; at?: string }) {
  const event = opts?.id
    ? { id: opts.id, kind, at: opts.at ?? new Date().toISOString(), label }
    : newSessionEvent(kind, label);

  useCall.setState((s) => {
    if (s.sessionLog.some((e) => e.id === event.id)) return s;
    return { sessionLog: [...s.sessionLog, event] };
  });

  if (!opts?.remote) {
    const { sessionId, phase } = useCall.getState();
    if (phase === "in-call" && sessionId) {
      emitCallSessionEvent(sessionId, kind, label);
    }
  }
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
  },
  onPeerLeft: (socketId) => {
    getMesh().dropPeer(socketId);
  },
  onPeerMedia: (socketId, micOn, camOn, sharingScreen) => {
    const state = useCall.getState();
    const prev =
      state.participants.find((p) => p.socketId === socketId) ??
      state.roster.find((p) => p.socketId === socketId);
    const name = prev?.name ?? "Teammate";
    if (sharingScreen && !prev?.sharingScreen) {
      appendLog("screen_shared", `${name} is sharing their screen`, { remote: true });
    } else if (!sharingScreen && prev?.sharingScreen) {
      appendLog("screen_stopped", `${name} stopped screen sharing`, { remote: true });
    }
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
  onSessionEvent: (event) => {
    if (useCall.getState().phase !== "in-call") return;
    appendLog(event.kind as SessionEvent["kind"], event.label, {
      remote: true,
      id: event.id,
      at: event.at,
    });
  },
  onNotes: (notes) => useCall.setState({ collaborativeNotes: notes }),
  onWhiteboard: (strokes) =>
    useCall.setState({ whiteboardStrokes: strokes as WhiteboardStroke[] }),
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
  speakers: [],
  cameraId: "",
  micId: "",
  speakerId: "",
  contextTask: null,
  sessionId: null,
  sessionLog: [],
  collaborativeNotes: "",
  whiteboardStrokes: [],
  wrapUpOpen: false,

  observe: (projectId) => set({ projectId }),

  logSession: (kind, label) => appendLog(kind, label),

  setCollaborativeNotes: (notes) => {
    const { sessionId, phase } = get();
    set({ collaborativeNotes: notes });
    if (phase === "in-call" && sessionId) emitCallNotes(sessionId, notes);
  },

  setWhiteboardStrokes: (strokes) => {
    const { sessionId, phase } = get();
    set({ whiteboardStrokes: strokes });
    if (phase === "in-call" && sessionId) emitCallWhiteboard(sessionId, strokes);
  },

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
      const { cameras, mics, speakers } = await listMediaDevices();
      set({
        localStream: stream,
        cameras,
        mics,
        speakers,
        cameraId: stream.getVideoTracks()[0]?.getSettings().deviceId ?? cameras[0]?.deviceId ?? "",
        micId: stream.getAudioTracks()[0]?.getSettings().deviceId ?? mics[0]?.deviceId ?? "",
        micOn: true,
        camOn: true,
      });
      getMesh().setLocalStream(stream);
      watchDevices(() => void useCall.getState().refreshDevices());
    } catch {
      set({ phase: "idle" });
      toast.error("Allow camera and microphone access to join the SyncRoom.");
    }
  },

  closeLobby: () => {
    teardown();
    unwatchDevices();
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
    if (get().sharingScreen) {
      toast.error("Stop screen sharing before changing camera.");
      return;
    }
    const { localStream, micId, micOn } = get();
    stopStream(localStream);
    const stream = await openLocalMedia({ video: true, audio: micOn, cameraId: id, micId });
    set({ localStream: stream, cameraId: id, camOn: true });
    getMesh().setLocalStream(stream);
  },

  setMicId: async (id) => {
    if (get().sharingScreen) {
      toast.error("Stop screen sharing before changing microphone.");
      return;
    }
    const { localStream, cameraId, camOn } = get();
    stopStream(localStream);
    const stream = await openLocalMedia({ video: camOn, audio: true, cameraId, micId: id });
    set({ localStream: stream, micId: id, micOn: true });
    getMesh().setLocalStream(stream);
  },

  setSpeakerId: (id) => set({ speakerId: id }),

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

      set({
        phase: "in-call",
        sessionId: res.sessionId,
        collaborativeNotes: res.notes ?? "",
        whiteboardStrokes: (res.whiteboard ?? []) as WhiteboardStroke[],
      });
      for (const peer of res.peers) {
        getMesh().rememberPeer(peer);
        upsertParticipant(peer);
        void getMesh().offerTo(peer.socketId);
      }
      publishMedia();
      toast.success(contextTask ? `Live discussion started on “${contextTask.title}”.` : "You're in the SyncRoom.");
      void get().refreshDevices();
    },
    );
  },

  leave: () => {
    const phase = get().phase;
    // Always tear down — even if already idle with wrap-up open, allow re-click.
    if (phase !== "idle") {
      try {
        emitCallLeave();
      } catch {
        /* socket may already be down */
      }
      appendLog("session_ended", "You left the SyncRoom");
    }
    teardown();
    unwatchDevices();
    set({
      phase: "idle",
      localStream: null,
      participants: [],
      sharingScreen: false,
      viewMode: "default",
      sessionId: null,
      wrapUpOpen: phase !== "idle" || get().wrapUpOpen,
    });
  },

  dismissWrapUp: () =>
    set({
      wrapUpOpen: false,
      sessionLog: [],
      contextTask: null,
      sessionId: null,
      collaborativeNotes: "",
      whiteboardStrokes: [],
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
    const { sharingScreen, localStream, phase } = get();
    if (phase !== "in-call") {
      toast.info("Join the SyncRoom first, then share your screen.");
      return;
    }

    let stream = localStream;
    if (!stream) {
      try {
        stream = await openLocalMedia({
          video: get().camOn,
          audio: true,
          cameraId: get().cameraId || undefined,
          micId: get().micId || undefined,
        });
        set({ localStream: stream });
        getMesh().setLocalStream(stream);
      } catch {
        toast.error("Allow microphone access to share your screen.");
        return;
      }
    }

    if (!sharingScreen) {
      let display: MediaStream;
      try {
        display = await openScreenShare();
      } catch (err) {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          toast.info("Screen share cancelled.");
        } else if (err instanceof DOMException && err.name === "NotSupportedError") {
          toast.error("Screen sharing is not supported in this browser.");
        } else {
          toast.error(err instanceof Error ? err.message : "Could not start screen sharing.");
        }
        return;
      }
      const screenTrack = display.getVideoTracks()[0];
      if (!screenTrack) {
        toast.error("No screen track available.");
        display.getTracks().forEach((t) => t.stop());
        return;
      }

      savedCameraTrack = cameraTrackFromStream(stream);
      const existingScreen = screenTrackFromStream(stream);
      if (existingScreen) {
        stream.removeTrack(existingScreen);
        existingScreen.stop();
      }
      if (savedCameraTrack) stream.removeTrack(savedCameraTrack);
      stream.addTrack(screenTrack);
      getMesh().setCameraVideoTrack(savedCameraTrack);
      await getMesh().startScreenShare(screenTrack);
      getMesh().setLocalStream(stream);
      set({ sharingScreen: true, localStream: stream, camOn: true, viewMode: "expanded" });
      appendLog("screen_shared", "You started screen sharing");
      publishMedia();
      toast.success("Sharing your screen — teammates can verify your work.");
      screenTrack.onended = () => void get().toggleScreen();
    } else {
      const active = stream ?? localStream;
      if (!active) return;
      const screenTrack = screenTrackFromStream(active) ?? active.getVideoTracks()[0];
      if (screenTrack) {
        active.removeTrack(screenTrack);
        screenTrack.stop();
      }
      if (savedCameraTrack) {
        active.addTrack(savedCameraTrack);
        getMesh().setCameraVideoTrack(savedCameraTrack);
        await getMesh().stopScreenShare();
        savedCameraTrack = null;
      } else {
        getMesh().setCameraVideoTrack(null);
        await getMesh().clearOutgoingVideo();
      }
      getMesh().setLocalStream(active);
      set({ sharingScreen: false, localStream: active, camOn: !!active.getVideoTracks()[0] });
      appendLog("screen_stopped", "Screen sharing stopped");
      publishMedia();
    }
  },

  refreshDevices: async () => {
    const { cameras, mics, speakers } = await listMediaDevices();
    set({ cameras, mics, speakers });
    return { cameras, mics, speakers };
  },

  useMobileCamera: async () => {
    if (get().sharingScreen) {
      toast.error("Stop screen sharing before switching camera.");
      return false;
    }
    let { cameras } = get();
    if (cameras.length === 0) {
      ({ cameras } = await get().refreshDevices());
    }
    const mobile = findMobileCamera(cameras);
    if (!mobile) {
      toast.info(
        "No phone camera found. Connect via USB, Bluetooth, or a webcam app, then tap Refresh.",
      );
      return false;
    }
    await get().setCameraId(mobile.deviceId);
    toast.success(`Using ${mobile.label}`);
    return true;
  },

  useMobileMic: async () => {
    if (get().sharingScreen) {
      toast.error("Stop screen sharing before switching microphone.");
      return false;
    }
    let { mics } = get();
    if (mics.length === 0) {
      ({ mics } = await get().refreshDevices());
    }
    const mobile = findMobileMic(mics);
    if (!mobile) {
      toast.info(
        "No phone microphone found. Connect via USB or Bluetooth, then tap Refresh.",
      );
      return false;
    }
    await get().setMicId(mobile.deviceId);
    toast.success(`Using ${mobile.label}`);
    return true;
  },

  usePhoneCamera: async () => get().useMobileCamera(),

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
