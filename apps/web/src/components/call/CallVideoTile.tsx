"use client";

import { useEffect, useRef } from "react";
import { MicOff, MonitorUp } from "lucide-react";
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
}: {
  stream: MediaStream | null;
  name: string;
  avatarColor: string;
  micOn: boolean;
  camOn: boolean;
  sharingScreen?: boolean;
  isLocal?: boolean;
  large?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const speaking = useSpeaking(stream, micOn);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);

  const showVideo = !!stream && (camOn || sharingScreen);

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-ink-950 transition-shadow ${
        large ? "aspect-video min-h-[12rem]" : "aspect-video"
      } ${speaking ? "border-emerald-400/70 shadow-[0_0_0_2px_rgba(52,211,153,0.35)]" : "border-white/10"}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`h-full w-full object-cover ${showVideo ? "" : "hidden"} ${
          isLocal && !sharingScreen ? "-scale-x-100" : ""
        }`}
      />
      {!showVideo && (
        <div className="flex h-full w-full items-center justify-center bg-ink-900">
          <Avatar name={name} color={avatarColor} size={large ? 64 : 48} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/75 to-transparent px-2.5 py-2">
        <span className="truncate text-xs font-medium text-white">
          {name}
          {isLocal ? " (you)" : ""}
        </span>
        <div className="flex items-center gap-1">
          {sharingScreen && <MonitorUp className="h-3.5 w-3.5 text-brand-300" />}
          {!micOn && <MicOff className="h-3.5 w-3.5 text-red-400" />}
        </div>
      </div>
    </div>
  );
}
