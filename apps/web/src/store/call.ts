import { create } from "zustand";
import { getSocket } from "@/lib/socket";
import { toast } from "@/store/toast";

/**
 * WebRTC video-meeting client.
 *
 * Topology is a peer-to-peer mesh: every participant holds one
 * `RTCPeerConnection` to every other participant. The Socket.io server only
 * relays SDP offers/answers and ICE candidates — media never touches it.
 *
 * Glare avoidance: a newcomer initiates the offer to every *existing* peer.
 * Peers who join later initiate to us. So exactly one side offers per pair.
 */

export interface CallPeerInfo {
  socketId: string;
  userId: string;
  name: string;
  avatarColor: string;
  micOn: boolean;
  camOn: boolean;
}

export interface Participant extends CallPeerInfo {
  stream: MediaStream | null;
}

type Status = "idle" | "connecting" | "in-call";

interface CallState {
  projectId: string | null;
  status: Status;
  localStream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  minimized: boolean;
  participants: Participant[];
  /** Roster broadcast to the whole board room — drives the "join" badge. */
  roster: CallPeerInfo[];

  observe: (projectId: string) => void;
  unobserve: () => void;
  join: () => Promise<void>;
  leave: () => void;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleScreen: () => Promise<void>;
  setMinimized: (v: boolean) => void;
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

// ── Non-reactive engine state (kept out of the store to avoid re-renders) ──
const pcs = new Map<string, RTCPeerConnection>();
const infoBySocket = new Map<string, CallPeerInfo>();
let cameraTrack: MediaStreamTrack | null = null; // saved during screen share
let bound = false;

function publishMedia() {
  const { micOn, camOn } = useCall.getState();
  getSocket().emit("call:media", { micOn, camOn });
}

function upsertParticipant(info: CallPeerInfo, stream?: MediaStream | null) {
  useCall.setState((s) => {
    const existing = s.participants.find((p) => p.socketId === info.socketId);
    if (existing) {
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

function removeParticipant(socketId: string) {
  pcs.get(socketId)?.close();
  pcs.delete(socketId);
  infoBySocket.delete(socketId);
  useCall.setState((s) => ({
    participants: s.participants.filter((p) => p.socketId !== socketId),
  }));
}

function createPeer(socketId: string): RTCPeerConnection {
  const existing = pcs.get(socketId);
  if (existing) return existing;

  const pc = new RTCPeerConnection(ICE_CONFIG);
  pcs.set(socketId, pc);

  const local = useCall.getState().localStream;
  if (local) for (const track of local.getTracks()) pc.addTrack(track, local);

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      getSocket().emit("call:signal", { to: socketId, data: { candidate: e.candidate } });
    }
  };

  pc.ontrack = (e) => {
    const stream = e.streams[0] ?? new MediaStream([e.track]);
    const info = infoBySocket.get(socketId) ?? {
      socketId,
      userId: socketId,
      name: "Guest",
      avatarColor: "#6366f1",
      micOn: true,
      camOn: true,
    };
    upsertParticipant(info, stream);
  };

  pc.onconnectionstatechange = () => {
    if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
      // Leave cleanup to call:peer-left; a transient "disconnected" may recover.
      if (pc.connectionState === "failed") removeParticipant(socketId);
    }
  };

  return pc;
}

async function makeOffer(socketId: string) {
  const pc = createPeer(socketId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  getSocket().emit("call:signal", { to: socketId, data: { sdp: pc.localDescription } });
}

async function handleSignal(from: string, data: any) {
  const pc = createPeer(from);
  if (data?.sdp) {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    if (data.sdp.type === "offer") {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      getSocket().emit("call:signal", { to: from, data: { sdp: pc.localDescription } });
    }
  } else if (data?.candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch {
      /* candidate can arrive before remote description on slow links */
    }
  }
}

function teardownEngine() {
  for (const [, pc] of pcs) pc.close();
  pcs.clear();
  infoBySocket.clear();
  const { localStream } = useCall.getState();
  localStream?.getTracks().forEach((t) => t.stop());
  cameraTrack?.stop();
  cameraTrack = null;
}

export const useCall = create<CallState>((set, get) => ({
  projectId: null,
  status: "idle",
  localStream: null,
  micOn: true,
  camOn: true,
  screenSharing: false,
  minimized: false,
  participants: [],
  roster: [],

  observe: (projectId) => {
    set({ projectId });
    const socket = getSocket();

    if (!bound) {
      bound = true;

      socket.on("call:participants", (payload: { projectId: string; participants: CallPeerInfo[] }) => {
        if (payload.projectId !== get().projectId) return;
        set({ roster: payload.participants });
      });

      socket.on("call:peer-joined", ({ peer }: { peer: CallPeerInfo }) => {
        if (get().status !== "in-call") return;
        infoBySocket.set(peer.socketId, peer);
        // The newcomer will offer to us — just register their info for now.
      });

      socket.on("call:signal", ({ from, data }: { from: string; data: unknown }) => {
        if (get().status !== "in-call") return;
        void handleSignal(from, data);
      });

      socket.on("call:peer-media", ({ socketId, micOn, camOn }: { socketId: string; micOn: boolean; camOn: boolean }) => {
        const info = infoBySocket.get(socketId);
        if (info) infoBySocket.set(socketId, { ...info, micOn, camOn });
        useCall.setState((s) => ({
          participants: s.participants.map((p) =>
            p.socketId === socketId ? { ...p, micOn, camOn } : p,
          ),
        }));
      });

      socket.on("call:peer-left", ({ socketId }: { socketId: string }) => {
        removeParticipant(socketId);
      });
    }
  },

  unobserve: () => {
    if (get().status !== "idle") get().leave();
    set({ projectId: null, roster: [] });
  },

  join: async () => {
    const { projectId, status } = get();
    if (!projectId || status !== "idle") return;
    set({ status: "connecting" });

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      set({ status: "idle" });
      toast.error("Camera and microphone access is required to join the meeting.");
      return;
    }

    // The user may have hit "Leave" while the permission prompt was open —
    // don't resurrect a call they backed out of.
    if (get().status !== "connecting") {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    set({ localStream: stream, micOn: true, camOn: true, screenSharing: false, minimized: false });

    const socket = getSocket();
    socket.emit(
      "call:join",
      { projectId, micOn: true, camOn: true },
      (res: { peers: CallPeerInfo[] } | { error: string }) => {
        if ("error" in res) {
          set({ status: "idle" });
          stream.getTracks().forEach((t) => t.stop());
          toast.error("Couldn't join the meeting.");
          return;
        }
        set({ status: "in-call" });
        // We are the newcomer → initiate an offer to each existing peer.
        for (const peer of res.peers) {
          infoBySocket.set(peer.socketId, peer);
          void makeOffer(peer.socketId);
        }
        toast.success("You joined the meeting.");
      },
    );
  },

  leave: () => {
    if (get().status === "idle") return;
    getSocket().emit("call:leave");
    teardownEngine();
    set({
      status: "idle",
      localStream: null,
      participants: [],
      screenSharing: false,
      minimized: false,
    });
  },

  toggleMic: () => {
    const { localStream, micOn } = get();
    const next = !micOn;
    localStream?.getAudioTracks().forEach((t) => (t.enabled = next));
    set({ micOn: next });
    publishMedia();
  },

  toggleCam: () => {
    const { localStream, camOn } = get();
    const next = !camOn;
    localStream?.getVideoTracks().forEach((t) => (t.enabled = next));
    set({ camOn: next });
    publishMedia();
  },

  toggleScreen: async () => {
    const { screenSharing, localStream } = get();
    if (!localStream) return;

    if (!screenSharing) {
      let display: MediaStream;
      try {
        display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      } catch {
        return; // user cancelled the picker
      }
      const screenTrack = display.getVideoTracks()[0];
      cameraTrack = localStream.getVideoTracks()[0] ?? null;
      for (const [, pc] of pcs) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);
      }
      // Reflect the shared screen in our own preview.
      if (cameraTrack) localStream.removeTrack(cameraTrack);
      localStream.addTrack(screenTrack);
      set({ screenSharing: true, localStream });
      screenTrack.onended = () => void get().toggleScreen();
    } else {
      const screenTrack = localStream.getVideoTracks()[0];
      for (const [, pc] of pcs) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender && cameraTrack) await sender.replaceTrack(cameraTrack);
      }
      if (screenTrack) {
        localStream.removeTrack(screenTrack);
        screenTrack.stop();
      }
      if (cameraTrack) localStream.addTrack(cameraTrack);
      cameraTrack = null;
      set({ screenSharing: false, localStream });
    }
  },

  setMinimized: (v) => set({ minimized: v }),
}));
