"use client";

import { Users, X } from "lucide-react";
import type { MediaDeviceOption } from "@/lib/webrtc/types";
import { CallVideoTile } from "./CallVideoTile";

export function CallLobby({
  localStream,
  userName,
  avatarColor,
  micOn,
  camOn,
  cameras,
  mics,
  cameraId,
  micId,
  rosterCount,
  onClose,
  onJoinVideo,
  onJoinAudio,
  onCameraChange,
  onMicChange,
  onToggleMic,
  onToggleCam,
}: {
  localStream: MediaStream | null;
  userName: string;
  avatarColor: string;
  micOn: boolean;
  camOn: boolean;
  cameras: MediaDeviceOption[];
  mics: MediaDeviceOption[];
  cameraId: string;
  micId: string;
  rosterCount: number;
  onClose: () => void;
  onJoinVideo: () => void;
  onJoinAudio: () => void;
  onCameraChange: (id: string) => void;
  onMicChange: (id: string) => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 md:flex-row">
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

      <div className="flex w-full flex-col gap-3 md:w-56">
        {rosterCount > 0 && (
          <p className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            <Users className="h-3.5 w-3.5" />
            {rosterCount} teammate{rosterCount === 1 ? "" : "s"} already in the call
          </p>
        )}

        {cameras.length > 1 && (
          <label className="block text-xs text-gray-400">
            Camera
            <select
              className="input mt-1"
              value={cameraId}
              onChange={(e) => onCameraChange(e.target.value)}
            >
              {cameras.map((c) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {mics.length > 1 && (
          <label className="block text-xs text-gray-400">
            Microphone
            <select
              className="input mt-1"
              value={micId}
              onChange={(e) => onMicChange(e.target.value)}
            >
              {mics.map((m) => (
                <option key={m.deviceId} value={m.deviceId}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <button type="button" onClick={onJoinVideo} className="btn-primary w-full">
          Enter SyncRoom with video
        </button>
        <button type="button" onClick={onJoinAudio} className="btn-ghost w-full">
          Enter with audio only
        </button>
        <button type="button" onClick={onClose} className="btn-ghost w-full text-gray-400">
          <X className="mr-1 inline h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
}
