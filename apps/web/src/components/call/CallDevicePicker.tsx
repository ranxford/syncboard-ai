"use client";

import { RefreshCw, Smartphone } from "lucide-react";
import type { MediaDeviceOption } from "@/lib/webrtc/types";
import { findMobileCamera, findMobileMic, findMobileSpeaker } from "@/lib/webrtc/mediaDevices";

function mobileIcon(d: MediaDeviceOption) {
  return d.isMobileDevice || d.isPhoneCamera ? "📱 " : "";
}

export function CallDevicePicker({
  cameras,
  mics,
  speakers,
  cameraId,
  micId,
  speakerId,
  onCameraChange,
  onMicChange,
  onSpeakerChange,
  onRefreshDevices,
  onUseMobileCamera,
  onUseMobileMic,
  compact = false,
}: {
  cameras: MediaDeviceOption[];
  mics: MediaDeviceOption[];
  speakers: MediaDeviceOption[];
  cameraId: string;
  micId: string;
  speakerId: string;
  onCameraChange: (id: string) => void;
  onMicChange: (id: string) => void;
  onSpeakerChange: (id: string) => void;
  onRefreshDevices: () => void;
  onUseMobileCamera: () => void;
  onUseMobileMic: () => void;
  compact?: boolean;
}) {
  const mobileCam = findMobileCamera(cameras);
  const mobileMic = findMobileMic(mics);
  const mobileSpeaker = findMobileSpeaker(speakers);
  const usingMobileCam = cameras.find((c) => c.deviceId === cameraId)?.isMobileDevice;
  const usingMobileMic = mics.find((m) => m.deviceId === micId)?.isMobileDevice;

  return (
    <div
      className={`flex flex-col gap-2.5 ${compact ? "" : "rounded-lg border border-white/10 bg-white/[0.02] p-2.5"}`}
    >
      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Devices</p>
          <button
            type="button"
            onClick={onRefreshDevices}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-200"
            title="Refresh device list"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      )}

      <label className="block text-[10px] text-gray-500">
        Camera
        <select
          className="input mt-1 py-1.5 text-xs"
          value={cameraId}
          onChange={(e) => onCameraChange(e.target.value)}
        >
          {cameras.length === 0 && <option value="">No camera</option>}
          {cameras.map((c) => (
            <option key={c.deviceId} value={c.deviceId}>
              {mobileIcon(c)}
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onUseMobileCamera}
        className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
          usingMobileCam
            ? "border-brand-500/50 bg-brand-500/15 text-brand-100"
            : mobileCam
              ? "border-white/15 bg-white/[0.04] text-gray-200 hover:bg-white/[0.08]"
              : "border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"
        }`}
      >
        <Smartphone className="h-3.5 w-3.5 shrink-0" />
        {usingMobileCam ? "Using phone camera" : mobileCam ? "Use phone as camera" : "Phone camera"}
      </button>

      <label className="block text-[10px] text-gray-500">
        Microphone
        <select
          className="input mt-1 py-1.5 text-xs"
          value={micId}
          onChange={(e) => onMicChange(e.target.value)}
        >
          {mics.length === 0 && <option value="">No microphone</option>}
          {mics.map((m) => (
            <option key={m.deviceId} value={m.deviceId}>
              {mobileIcon(m)}
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onUseMobileMic}
        className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
          usingMobileMic
            ? "border-brand-500/50 bg-brand-500/15 text-brand-100"
            : mobileMic
              ? "border-white/15 bg-white/[0.04] text-gray-200 hover:bg-white/[0.08]"
              : "border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"
        }`}
      >
        <Smartphone className="h-3.5 w-3.5 shrink-0" />
        {usingMobileMic ? "Using phone mic" : mobileMic ? "Use phone as microphone" : "Phone microphone"}
      </button>

      {speakers.length > 0 && (
        <label className="block text-[10px] text-gray-500">
          Speaker / output
          <select
            className="input mt-1 py-1.5 text-xs"
            value={speakerId}
            onChange={(e) => onSpeakerChange(e.target.value)}
          >
            <option value="">System default</option>
            {speakers.map((s) => (
              <option key={s.deviceId} value={s.deviceId}>
                {mobileIcon(s)}
                {s.label}
              </option>
            ))}
          </select>
          {mobileSpeaker && (
            <p className="mt-1 text-[10px] text-gray-500">
              Tip: pick your phone or Bluetooth headset to route audio there.
            </p>
          )}
        </label>
      )}

      {!mobileCam && !mobileMic && (
        <p className="text-[10px] leading-relaxed text-gray-500">
          Connect a phone via USB, Bluetooth, or Continuity Camera (Mac + iPhone), then tap Refresh.
          Android webcams and apps like Camo / DroidCam also appear here.
        </p>
      )}
    </div>
  );
}

/** @deprecated use CallDevicePicker */
export const CallCameraPicker = CallDevicePicker;
