import type { MediaDeviceOption } from "./types";

export async function listMediaDevices(): Promise<{
  cameras: MediaDeviceOption[];
  mics: MediaDeviceOption[];
}> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { cameras: [], mics: [] };
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices
    .filter((d) => d.kind === "videoinput")
    .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
  const mics = devices
    .filter((d) => d.kind === "audioinput")
    .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
  return { cameras, mics };
}

export async function openLocalMedia(opts: {
  video: boolean;
  audio: boolean;
  cameraId?: string;
  micId?: string;
}): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: opts.audio
      ? opts.micId
        ? { deviceId: { exact: opts.micId } }
        : true
      : false,
    video: opts.video
      ? opts.cameraId
        ? { deviceId: { exact: opts.cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } }
      : false,
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}

export async function openScreenShare(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
}
