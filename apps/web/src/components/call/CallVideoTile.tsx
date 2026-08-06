"use client";

import { useEffect, useRef } from "react";
import { Eye, MicOff, MonitorUp } from "lucide-react";
import { useSpeaking } from "@/lib/webrtc/useSpeaking";
import { Avatar } from "../Avatar";

export function CallVideoTile({
  stream,
  name,
  avatarColor,
  micOn,
  camOn,
  sharingScreen,
  isLocal,
  large,
  speakerId,
}: {
  stream: MediaStream | null;
  name: string;
  avatarColor: string;
  micOn: boolean;
  camOn: boolean;
  sharingScreen?: boolean;
  isLocal?: boolean;
  large?: boolean;
  speakerId?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const speaking = useSpeaking(stream, micOn);
  const isScreen = !!sharingScreen;

  const videoTrackId = stream?.getVideoTracks()[0]?.id;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (stream) {
      el.srcObject = stream;
      void el.play().catch(() => {});
    }

    const videoTrack = stream?.getVideoTracks()[0];
    if (!videoTrack) return;

    const bump = () => {
      if (stream) el.srcObject = stream;
      void el.play().catch(() => {});
    };
    videoTrack.addEventListener("ended", bump);
    return () => videoTrack.removeEventListener("ended", bump);
  }, [stream, videoTrackId, isScreen]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || isLocal || !speakerId || !("setSinkId" in el)) return;
    void (el as HTMLVideoElement & { setSinkId: (id: string) => Promise<void> })
      .setSinkId(speakerId)
      .catch(() => {});
  }, [speakerId, isLocal, stream]);

  const showVideo = !!stream && (camOn || isScreen);

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-ink-950 transition-shadow ${
        large ? "aspect-video min-h-[12rem]" : "aspect-video"
      } ${speaking ? "border-emerald-400/70 shadow-[0_0_0_2px_rgba(52,211,153,0.35)]" : "border-white/10"} ${
        isScreen ? "ring-1 ring-brand-500/40" : ""
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`h-full w-full ${isScreen || large ? "bg-black object-contain" : "object-cover"} ${
          showVideo ? "" : "hidden"
        } ${isLocal && !isScreen ? "-scale-x-100" : ""}`}
      />
      {!showVideo && (
        <div className="flex h-full w-full items-center justify-center bg-ink-900">
          <Avatar name={name} color={avatarColor} size={large ? 64 : 48} />
        </div>
      )}
      {isScreen && (
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium text-brand-200">
          <Eye className="h-3 w-3" />
          {isLocal ? "You’re sharing" : "Live screen"}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/75 to-transparent px-2.5 py-2">
        <span className="truncate text-xs font-medium text-white">
          {name}
          {isLocal ? " (you)" : ""}
        </span>
        <div className="flex items-center gap-1">
          {isScreen && <MonitorUp className="h-3.5 w-3.5 text-brand-300" />}
          {!micOn && <MicOff className="h-3.5 w-3.5 text-red-400" />}
        </div>
      </div>
    </div>
  );
}
