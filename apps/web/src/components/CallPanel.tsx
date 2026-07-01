"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Minus,
  Maximize2,
  Users,
} from "lucide-react";
import { useCall, type Participant } from "@/store/call";
import { useAuth } from "@/store/auth";
import { Avatar } from "./Avatar";

function VideoTile({
  stream,
  name,
  avatarColor,
  micOn,
  camOn,
  isLocal,
  screenShare,
}: {
  stream: MediaStream | null;
  name: string;
  avatarColor: string;
  micOn: boolean;
  camOn: boolean;
  isLocal?: boolean;
  screenShare?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);

  const showVideo = !!stream && (camOn || screenShare);

  return (
    <div className="group relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-ink-950">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`h-full w-full object-cover ${showVideo ? "" : "hidden"} ${
          isLocal && !screenShare ? "-scale-x-100" : ""
        }`}
      />
      {!showVideo && (
        <div className="flex h-full w-full items-center justify-center bg-ink-900">
          <Avatar name={name} color={avatarColor} size={48} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
        <span className="truncate text-xs font-medium text-white">
          {name}
          {isLocal ? " (you)" : ""}
        </span>
        {!micOn && <MicOff className="h-3.5 w-3.5 shrink-0 text-red-400" />}
      </div>
    </div>
  );
}

function gridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 4) return "grid-cols-2";
  if (count <= 9) return "grid-cols-3";
  return "grid-cols-4";
}

export function CallPanel() {
  const status = useCall((s) => s.status);
  const localStream = useCall((s) => s.localStream);
  const participants = useCall((s) => s.participants);
  const micOn = useCall((s) => s.micOn);
  const camOn = useCall((s) => s.camOn);
  const screenSharing = useCall((s) => s.screenSharing);
  const minimized = useCall((s) => s.minimized);
  const { toggleMic, toggleCam, toggleScreen, leave, setMinimized } = useCall.getState();
  const user = useAuth((s) => s.user);

  if (status === "idle") return null;

  const total = participants.length + 1;
  const connecting = status === "connecting";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="card card-shadow fixed bottom-4 right-4 z-[80] flex w-[min(92vw,28rem)] flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Meeting
            <span className="flex items-center gap-1 text-xs font-normal text-gray-400">
              <Users className="h-3.5 w-3.5" /> {total}
            </span>
          </div>
          <button
            onClick={() => setMinimized(!minimized)}
            className="rounded p-1 text-gray-400 transition-colors hover:text-gray-100"
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? <Maximize2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </button>
        </div>

        {!minimized && (
          <div className="p-3">
            {connecting ? (
              <div className="flex h-32 items-center justify-center gap-2 text-sm text-gray-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                Connecting…
              </div>
            ) : (
              <div className={`grid gap-2 ${gridClass(total)}`}>
                <VideoTile
                  stream={localStream}
                  name={user?.name ?? "You"}
                  avatarColor={user?.avatarColor ?? "#6366f1"}
                  micOn={micOn}
                  camOn={camOn}
                  isLocal
                  screenShare={screenSharing}
                />
                {participants.map((p: Participant) => (
                  <VideoTile
                    key={p.socketId}
                    stream={p.stream}
                    name={p.name}
                    avatarColor={p.avatarColor}
                    micOn={p.micOn}
                    camOn={p.camOn}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-white/[0.02] px-3 py-2.5">
          <CtrlButton active={micOn} onClick={toggleMic} title={micOn ? "Mute" : "Unmute"}>
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </CtrlButton>
          <CtrlButton active={camOn} onClick={toggleCam} title={camOn ? "Turn camera off" : "Turn camera on"}>
            {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </CtrlButton>
          <CtrlButton active={screenSharing} accent onClick={() => void toggleScreen()} title="Share screen">
            <MonitorUp className="h-4 w-4" />
          </CtrlButton>
          <button
            onClick={leave}
            className="ml-1 flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
            title="Leave meeting"
          >
            <PhoneOff className="h-4 w-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function CtrlButton({
  active,
  accent,
  onClick,
  title,
  children,
}: {
  active: boolean;
  accent?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const base = "flex h-10 w-10 items-center justify-center rounded-lg transition-colors";
  const style = accent
    ? active
      ? "bg-brand-500 text-white"
      : "bg-white/[0.06] text-gray-300 hover:bg-white/10"
    : active
      ? "bg-white/[0.06] text-gray-100 hover:bg-white/10"
      : "bg-red-500/15 text-red-300 hover:bg-red-500/25";
  return (
    <button onClick={onClick} title={title} className={`${base} ${style}`}>
      {children}
    </button>
  );
}
