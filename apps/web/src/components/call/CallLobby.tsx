"use client";

import { Users, X } from "lucide-react";
import type { MediaDeviceOption } from "@/lib/webrtc/types";
import { CallDevicePicker } from "./CallDevicePicker";
import { CallVideoTile } from "./CallVideoTile";

export function CallLobby({
  localStream,
  userName,
  avatarColor,
  micOn,
  camOn,
  cameras,
  mics,
  speakers,
  cameraId,
  micId,
  speakerId,
  rosterCount,
  onClose,
  onJoinVideo,
  onJoinAudio,
  onCameraChange,
  onMicChange,
  onSpeakerChange,
  onToggleMic,
  onToggleCam,
  onRefreshDevices,
  onUseMobileCamera,
  onUseMobileMic,
}: {
  localStream: MediaStream | null;
  userName: string;
  avatarColor: string;
  micOn: boolean;
  camOn: boolean;
  cameras: MediaDeviceOption[];
  mics: MediaDeviceOption[];
  speakers: MediaDeviceOption[];
  cameraId: string;
  micId: string;
  speakerId: string;
  rosterCount: number;
  onClose: () => void;
  onJoinVideo: () => void;
  onJoinAudio: () => void;
  onCameraChange: (id: string) => void;
  onMicChange: (id: string) => void;
  onSpeakerChange: (id: string) => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onRefreshDevices: () => void;
  onUseMobileCamera: () => void;
  onUseMobileMic: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex-1">
        <CallVideoTile
          stream={localStream}
          name={userName}
          avatarColor={avatarColor}
          micOn={micOn}
          camOn={camOn}
          isLocal
          large
        />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onToggleMic} className="btn-ghost flex-1 py-2 text-xs">
            {micOn ? "Mute" : "Unmute"}
          </button>
          <button type="button" onClick={onToggleCam} className="btn-ghost flex-1 py-2 text-xs">
            {camOn ? "Stop video" : "Start video"}
          </button>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        {rosterCount > 0 && (
          <p className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            <Users className="h-3.5 w-3.5" />
            {rosterCount} teammate{rosterCount === 1 ? "" : "s"} already in the call
          </p>
        )}

        <CallDevicePicker
          cameras={cameras}
          mics={mics}
          speakers={speakers}
          cameraId={cameraId}
          micId={micId}
          speakerId={speakerId}
          onCameraChange={onCameraChange}
          onMicChange={onMicChange}
          onSpeakerChange={onSpeakerChange}
          onRefreshDevices={onRefreshDevices}
          onUseMobileCamera={onUseMobileCamera}
          onUseMobileMic={onUseMobileMic}
        />

        <button type="button" onClick={onJoinVideo} className="btn-primary w-full">
          Enter SyncRoom with video
        </button>
        <button type="button" onClick={onJoinAudio} className="btn-ghost w-full">
          Enter with audio only
        </button>
        <p className="text-[11px] leading-relaxed text-gray-500">
          After joining, use <span className="text-brand-300">Share screen</span> in the toolbar or
          panel footer to show your work.
        </p>
        <button type="button" onClick={onClose} className="btn-ghost w-full text-gray-400">
          <X className="mr-1 inline h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
}
