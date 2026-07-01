import { getIceServers } from "./config";
import type { CallPeerInfo, SignalMessage } from "./types";

type SendSignal = (toSocketId: string, message: SignalMessage) => void;

/**
 * One RTCPeerConnection per remote participant (mesh topology).
 * The newcomer always sends the offer to avoid SDP glare.
 */
export class PeerMesh {
  private connections = new Map<string, RTCPeerConnection>();
  private peerInfo = new Map<string, CallPeerInfo>();
  private localStream: MediaStream | null = null;
  private cameraVideoTrack: MediaStreamTrack | null = null;

  constructor(
    private sendSignal: SendSignal,
    private onRemoteStream: (socketId: string, stream: MediaStream) => void,
    private onPeerGone: (socketId: string) => void,
  ) {}

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    this.cameraVideoTrack = stream?.getVideoTracks()[0] ?? null;
    for (const pc of this.connections.values()) {
      this.syncLocalTracks(pc);
    }
  }

  rememberPeer(info: CallPeerInfo) {
    this.peerInfo.set(info.socketId, info);
  }

  /** Newcomer calls this once per existing peer. */
  async offerTo(socketId: string) {
    const pc = this.getOrCreateConnection(socketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.sendSignal(socketId, { sdp: pc.localDescription!.toJSON() });
  }

  async handleSignal(from: string, message: SignalMessage) {
    const pc = this.getOrCreateConnection(from);

    if ("sdp" in message && message.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
      if (message.sdp.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal(from, { sdp: pc.localDescription!.toJSON() });
      }
      return;
    }

    if ("candidate" in message && message.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
      } catch {
        /* ICE can arrive before remote description on slow links */
      }
    }
  }

  async startScreenShare(screenTrack: MediaStreamTrack) {
    await this.replaceOutgoingVideo(screenTrack);
  }

  async stopScreenShare() {
    if (this.cameraVideoTrack) {
      await this.replaceOutgoingVideo(this.cameraVideoTrack);
    }
  }

  dropPeer(socketId: string) {
    this.connections.get(socketId)?.close();
    this.connections.delete(socketId);
    this.peerInfo.delete(socketId);
    this.onPeerGone(socketId);
  }

  closeAll() {
    for (const pc of this.connections.values()) pc.close();
    this.connections.clear();
    this.peerInfo.clear();
    this.localStream = null;
    this.cameraVideoTrack = null;
  }

  // ── internals ───────────────────────────────────────────────

  private getOrCreateConnection(socketId: string): RTCPeerConnection {
    const existing = this.connections.get(socketId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(getIceServers());
    this.connections.set(socketId, pc);
    this.syncLocalTracks(pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(socketId, { candidate: event.candidate.toJSON() });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      this.onRemoteStream(socketId, stream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        void this.retryConnection(socketId, pc);
      } else if (pc.connectionState === "closed") {
        this.dropPeer(socketId);
      }
    };

    return pc;
  }

  private syncLocalTracks(pc: RTCPeerConnection) {
    if (!this.localStream) return;
    for (const track of this.localStream.getTracks()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
      if (sender) void sender.replaceTrack(track);
      else pc.addTrack(track, this.localStream);
    }
  }

  private async replaceOutgoingVideo(track: MediaStreamTrack) {
    for (const pc of this.connections.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(track);
    }
  }

  private async retryConnection(socketId: string, pc: RTCPeerConnection) {
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      this.sendSignal(socketId, { sdp: pc.localDescription!.toJSON() });
    } catch {
      this.dropPeer(socketId);
    }
  }
}
