import { getSocket } from "@/lib/socket";
import type { CallPeerInfo, SignalMessage } from "./types";

type Handlers = {
  onRoster: (projectId: string, participants: CallPeerInfo[]) => void;
  onPeerJoined: (peer: CallPeerInfo) => void;
  onPeerLeft: (socketId: string) => void;
  onPeerMedia: (socketId: string, micOn: boolean, camOn: boolean, sharingScreen: boolean) => void;
  onSignal: (from: string, message: SignalMessage) => void;
  isInCall: () => boolean;
  projectId: () => string | null;
};

let attached = false;

/** Wire Socket.io call events once for the whole app session. */
export function bindCallSignaling(handlers: Handlers) {
  if (attached) return;
  attached = true;

  const socket = getSocket();

  socket.on("call:participants", (payload: { projectId: string; participants: CallPeerInfo[] }) => {
    if (payload.projectId !== handlers.projectId()) return;
    handlers.onRoster(payload.projectId, payload.participants);
  });

  socket.on("call:peer-joined", ({ peer }: { peer: CallPeerInfo }) => {
    if (!handlers.isInCall()) return;
    handlers.onPeerJoined(peer);
  });

  socket.on("call:peer-left", ({ socketId }: { socketId: string }) => {
    handlers.onPeerLeft(socketId);
  });

  socket.on(
    "call:peer-media",
    ({
      socketId,
      micOn,
      camOn,
      sharingScreen,
    }: {
      socketId: string;
      micOn: boolean;
      camOn: boolean;
      sharingScreen?: boolean;
    }) => {
      handlers.onPeerMedia(socketId, micOn, camOn, !!sharingScreen);
    },
  );

  socket.on("call:signal", ({ from, data }: { from: string; data: SignalMessage }) => {
    if (!handlers.isInCall()) return;
    handlers.onSignal(from, data);
  });
}

export function emitCallJoin(
  projectId: string,
  media: { micOn: boolean; camOn: boolean; focusTaskId?: string | null; focusTaskTitle?: string | null },
  ack: (res: { peers: CallPeerInfo[] } | { error: string }) => void,
) {
  getSocket().emit("call:join", { projectId, ...media }, ack);
}

export function emitCallLeave() {
  getSocket().emit("call:leave");
}

export function emitCallMedia(micOn: boolean, camOn: boolean, sharingScreen: boolean) {
  getSocket().emit("call:media", { micOn, camOn, sharingScreen });
}

export function emitCallSignal(to: string, message: SignalMessage) {
  getSocket().emit("call:signal", { to, data: message });
}
