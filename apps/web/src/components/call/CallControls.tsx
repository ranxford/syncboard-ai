"use client";

import {
  Link2,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Minus,
  MonitorUp,
  Smartphone,
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
  onViewMode,
  onUseMobileCamera,
  hasMobileCamera,
  pinned = false,
  compact = false,
}: {
  micOn: boolean;
  camOn: boolean;
  sharingScreen: boolean;
  viewMode: CallViewMode;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreen: () => void;
  onCopyLink: () => void;
  onLeave?: () => void;
  onViewMode: (mode: CallViewMode) => void;
  onUseMobileCamera?: () => void;
  hasMobileCamera?: boolean;
  pinned?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative z-10 flex flex-col gap-2 border-t border-brand-500/20 bg-ink-950 shadow-[0_-8px_24px_rgba(0,0,0,0.45)] ${
        pinned ? "shrink-0" : ""
      } ${compact ? "px-2 py-2" : "px-3 py-3"}`}
    >
      <button
        type="button"
        onClick={onToggleScreen}
        title={sharingScreen ? "Stop sharing (S)" : "Share screen — show your work (S)"}
        className={`flex w-full items-center justify-center gap-2 rounded-lg font-semibold transition-colors ${
          compact ? "py-2 text-xs" : "py-2.5 text-sm"
        } ${
          sharingScreen
            ? "bg-brand-500 text-ink-950 hover:bg-brand-400"
            : "bg-brand-500 text-ink-950 hover:bg-brand-400"
        }`}
      >
        <MonitorUp className="h-4 w-4 shrink-0" />
        {sharingScreen ? "Stop sharing screen" : "Share screen"}
      </button>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <CtrlButton
          active={micOn}
          onClick={onToggleMic}
          title={micOn ? "Mute (M)" : "Unmute (M)"}
          compact={compact}
        >
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </CtrlButton>
        <CtrlButton
          active={camOn && !sharingScreen}
          onClick={onToggleCam}
          title={camOn ? "Stop video (V)" : "Start video (V)"}
          disabled={sharingScreen}
          compact={compact}
        >
          {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </CtrlButton>

        {hasMobileCamera && onUseMobileCamera && (
          <CtrlButton active onClick={onUseMobileCamera} title="Use phone as camera" compact={compact}>
            <Smartphone className="h-4 w-4" />
          </CtrlButton>
        )}

        {!compact && (
          <>
            <CtrlButton active onClick={onCopyLink} title="Copy invite link">
              <Link2 className="h-4 w-4" />
            </CtrlButton>
            <CtrlButton
              active
              onClick={() => onViewMode(viewMode === "fullscreen" ? "expanded" : "fullscreen")}
              title={viewMode === "fullscreen" ? "Exit fullscreen" : "Fullscreen"}
            >
              {viewMode === "fullscreen" ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </CtrlButton>
          </>
        )}
      </div>
    </div>
  );
}

function CtrlButton({
  active,
  disabled,
  onClick,
  title,
  children,
  compact,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const size = compact ? "h-9 w-9" : "h-10 w-10";
  const base = `flex ${size} items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40`;
  const style = active
    ? "bg-white/[0.08] text-gray-100 hover:bg-white/12"
    : "bg-red-500/15 text-red-300 hover:bg-red-500/25";
  return (
    <button type="button" disabled={disabled} onClick={onClick} title={title} className={`${base} ${style}`}>
      {children}
    </button>
  );
}

/** Minimize / expand only — End lives in the panel header. */
export function CallHeaderControls({
  viewMode,
  onViewMode,
}: {
  viewMode: CallViewMode;
  onViewMode: (mode: CallViewMode) => void;
  onEndSession?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onViewMode(viewMode === "minimized" ? "expanded" : "minimized")}
      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-100"
      title={viewMode === "minimized" ? "Expand sidebar" : "Minimize"}
    >
      {viewMode === "minimized" ? <Maximize2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
    </button>
  );
}
