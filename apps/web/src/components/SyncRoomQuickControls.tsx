"use client";

import { Mic, MicOff, MonitorUp, Video, VideoOff } from "lucide-react";
import { useSyncRoom } from "@/store/call";

/** Call controls when SyncRoom is minimized — sidebar has full controls when expanded. */
export function SyncRoomQuickControls() {
  const phase = useSyncRoom((s) => s.phase);
  const viewMode = useSyncRoom((s) => s.viewMode);
  const micOn = useSyncRoom((s) => s.micOn);
  const camOn = useSyncRoom((s) => s.camOn);
  const sharingScreen = useSyncRoom((s) => s.sharingScreen);
  const toggleMic = useSyncRoom((s) => s.toggleMic);
  const toggleCam = useSyncRoom((s) => s.toggleCam);
  const toggleScreen = useSyncRoom((s) => s.toggleScreen);
  const setViewMode = useSyncRoom((s) => s.setViewMode);

  if (phase !== "in-call" || viewMode !== "minimized") return null;

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-ink-900/90 p-0.5">
      <IconBtn active={micOn} onClick={toggleMic} title="Mic">
        {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
      </IconBtn>
      <IconBtn active={camOn && !sharingScreen} onClick={toggleCam} disabled={sharingScreen} title="Camera">
        {camOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
      </IconBtn>
      <button
        type="button"
        onClick={() => void toggleScreen()}
        className={`rounded px-2 py-1 text-[10px] font-medium ${
          sharingScreen ? "bg-brand-500 text-ink-950" : "bg-brand-500/20 text-brand-100"
        }`}
      >
        <MonitorUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setViewMode("expanded")}
        className="rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-white/10"
      >
        Open
      </button>
    </div>
  );
}

function IconBtn({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 disabled:opacity-40 ${
        active ? "text-gray-100 hover:bg-white/10" : "text-red-300 hover:bg-red-500/20"
      }`}
    >
      {children}
    </button>
  );
}
