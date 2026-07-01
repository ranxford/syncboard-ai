"use client";

import {
  Link2,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Minus,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import type { CallViewMode } from "@/lib/webrtc/types";

export function CallControls({
  micOn,
  camOn,
  sharingScreen,
  viewMode,
  onToggleMic,
  onToggleCam,
  onToggleScreen,
  onCopyLink,
  onLeave,
  onViewMode,
}: {
  micOn: boolean;
  camOn: boolean;
  sharingScreen: boolean;
  viewMode: CallViewMode;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreen: () => void;
  onCopyLink: () => void;
  onLeave: () => void;
  onViewMode: (mode: CallViewMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-white/[0.02] px-3 py-2.5">
      <CtrlButton active={micOn} onClick={onToggleMic} title={micOn ? "Mute (M)" : "Unmute (M)"}>
        {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </CtrlButton>
      <CtrlButton
        active={camOn && !sharingScreen}
        onClick={onToggleCam}
        title={camOn ? "Stop video (V)" : "Start video (V)"}
        disabled={sharingScreen}
      >
        {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </CtrlButton>
      <CtrlButton
        active={sharingScreen}
        accent
        onClick={onToggleScreen}
        title="Share screen (S)"
      >
        <MonitorUp className="h-4 w-4" />
      </CtrlButton>
      <CtrlButton active onClick={onCopyLink} title="Copy invite link">
        <Link2 className="h-4 w-4" />
      </CtrlButton>
      <CtrlButton
        active
        onClick={() => onViewMode(viewMode === "fullscreen" ? "expanded" : "fullscreen")}
        title={viewMode === "fullscreen" ? "Exit fullscreen" : "Fullscreen"}
      >
        {viewMode === "fullscreen" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </CtrlButton>
      <button
        onClick={onLeave}
        className="ml-1 flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
        title="Leave SyncRoom"
      >
        <PhoneOff className="h-4 w-4" />
        <span className="hidden sm:inline">Leave</span>
      </button>
    </div>
  );
}

function CtrlButton({
  active,
  accent,
  disabled,
  onClick,
  title,
  children,
}: {
  active: boolean;
  accent?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const base =
    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const style = accent
    ? active
      ? "bg-brand-500 text-white"
      : "bg-white/[0.06] text-gray-300 hover:bg-white/10"
    : active
      ? "bg-white/[0.06] text-gray-100 hover:bg-white/10"
      : "bg-red-500/15 text-red-300 hover:bg-red-500/25";
  return (
    <button type="button" disabled={disabled} onClick={onClick} title={title} className={`${base} ${style}`}>
      {children}
    </button>
  );
}

export function CallHeaderControls({
  viewMode,
  onViewMode,
}: {
  viewMode: CallViewMode;
  onViewMode: (mode: CallViewMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onViewMode(viewMode === "minimized" ? "expanded" : "minimized")}
      className="rounded p-1 text-gray-400 transition-colors hover:text-gray-100"
      title={viewMode === "minimized" ? "Expand" : "Minimize"}
    >
      {viewMode === "minimized" ? <Maximize2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
    </button>
  );
}
