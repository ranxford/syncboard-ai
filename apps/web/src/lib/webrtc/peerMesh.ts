import { getIceServers } from "./config";
import { cameraTrackFromStream, isScreenShareTrack } from "./trackUtils";
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
  /** Camera track to restore after screen share — never the screen track. */
  private cameraVideoTrack: MediaStreamTrack | null = null;

  constructor(
    private sendSignal: SendSignal,
    private onRemoteStream: (socketId: string, stream: MediaStream) => void,
    private onPeerGone: (socketId: string) => void,
  ) {}

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    const cam = cameraTrackFromStream(stream);
    if (cam) this.cameraVideoTrack = cam;
    for (const pc of this.connections.values()) {
      void this.syncLocalTracks(pc);
    }
  }

  /** Keep camera restore target in sync when swapping to/from screen share. */
  setCameraVideoTrack(track: MediaStreamTrack | null) {
    if (track && isScreenShareTrack(track)) return;
    this.cameraVideoTrack = track;
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
      const desc = new RTCSessionDescription(message.sdp);

      if (desc.type === "offer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
        }
        await pc.setRemoteDescription(desc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal(from, { sdp: pc.localDescription!.toJSON() });
        return;
      }

      if (desc.type === "answer" && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(desc);
        return;
      }

      await pc.setRemoteDescription(desc);
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
    await this.replaceOutgoingVideo(this.cameraVideoTrack);
  }

  /** Stop sending video entirely (audio-only after screen share). */
  async clearOutgoingVideo() {
    await this.replaceOutgoingVideo(null);
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
    void this.syncLocalTracks(pc);

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

  private async syncLocalTracks(pc: RTCPeerConnection) {
    if (!this.localStream) return;
    for (const track of this.localStream.getTracks()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
      if (sender) {
        await sender.replaceTrack(track);
      } else {
        pc.addTrack(track, this.localStream);
      }
    }
  }

  private getVideoSender(pc: RTCPeerConnection): RTCRtpSender | undefined {
    return pc.getSenders().find((s) => s.track?.kind === "video");
  }

  private async replaceOutgoingVideo(track: MediaStreamTrack | null) {
    for (const [socketId, pc] of this.connections) {
      const sender = this.getVideoSender(pc);

      if (sender) {
        await sender.replaceTrack(track);
        await this.renegotiate(socketId, pc);
        continue;
      }

      if (track && this.localStream) {
        pc.addTrack(track, this.localStream);
        await this.renegotiate(socketId, pc);
      }
    }
  }

  private async renegotiate(socketId: string, pc: RTCPeerConnection) {
    if (pc.signalingState !== "stable") return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.sendSignal(socketId, { sdp: pc.localDescription!.toJSON() });
    } catch {
      /* peer may have disconnected */
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
