import type { MediaDeviceOption } from "./types";

const MOBILE_CAMERA_RE =
  /iphone|ipad|android|galaxy|pixel|samsung|mobile|continuity|belkin|ios|epoc|camo|phone|droid|huawei|oneplus|xiaomi|oppo|vivo|webcam.*phone/i;

const MOBILE_MIC_RE =
  /iphone|ipad|android|galaxy|pixel|samsung|mobile|continuity|phone|airpods|buds|bluetooth|headset|earbuds|hands.?free|car audio|droid|huawei|oneplus/i;

const MOBILE_SPEAKER_RE =
  /iphone|ipad|android|galaxy|pixel|samsung|mobile|phone|airpods|buds|bluetooth|headset|earbuds|hands.?free|external|usb|droid/i;

export function isMobileCameraLabel(label: string): boolean {
  return MOBILE_CAMERA_RE.test(label);
}

export function isMobileMicLabel(label: string): boolean {
  return MOBILE_MIC_RE.test(label);
}

export function isMobileSpeakerLabel(label: string): boolean {
  return MOBILE_SPEAKER_RE.test(label);
}

export function annotateDevices<T extends MediaDeviceOption>(devices: T[], kind: "camera" | "mic" | "speaker"): T[] {
  const test =
    kind === "camera"
      ? isMobileCameraLabel
      : kind === "mic"
        ? isMobileMicLabel
        : isMobileSpeakerLabel;
  return devices.map((d) => ({
    ...d,
    isMobileDevice: test(d.label),
    ...(kind === "camera" ? { isPhoneCamera: test(d.label) } : {}),
  }));
}

export function findMobileCamera(cameras: MediaDeviceOption[]): MediaDeviceOption | undefined {
  return annotateDevices(cameras, "camera").find((c) => c.isMobileDevice);
}

export function findMobileMic(mics: MediaDeviceOption[]): MediaDeviceOption | undefined {
  return annotateDevices(mics, "mic").find((m) => m.isMobileDevice);
}

export function findMobileSpeaker(speakers: MediaDeviceOption[]): MediaDeviceOption | undefined {
  return annotateDevices(speakers, "speaker").find((s) => s.isMobileDevice);
}

/** @deprecated use findMobileCamera */
export const findPhoneCamera = findMobileCamera;

export async function listMediaDevices(): Promise<{
  cameras: MediaDeviceOption[];
  mics: MediaDeviceOption[];
  speakers: MediaDeviceOption[];
}> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { cameras: [], mics: [], speakers: [] };
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = annotateDevices(
    devices
      .filter((d) => d.kind === "videoinput")
      .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })),
    "camera",
  );
  const mics = annotateDevices(
    devices
      .filter((d) => d.kind === "audioinput")
      .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` })),
    "mic",
  );
  const speakers = annotateDevices(
    devices
      .filter((d) => d.kind === "audiooutput")
      .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${i + 1}` })),
    "speaker",
  );
  return { cameras, mics, speakers };
}

export async function openLocalMedia(opts: {
  video: boolean;
  audio: boolean;
  cameraId?: string;
  micId?: string;
}): Promise<MediaStream> {
  const videoConstraints: boolean | MediaTrackConstraints = opts.video
    ? opts.cameraId
      ? { deviceId: { exact: opts.cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
      : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
    : false;

  const audioConstraints: boolean | MediaTrackConstraints = opts.audio
    ? opts.micId
      ? { deviceId: { exact: opts.micId } }
      : true
    : false;

  return navigator.mediaDevices.getUserMedia({
    audio: audioConstraints,
    video: videoConstraints,
  });
}

export async function openScreenShare(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new DOMException("Screen sharing is not supported in this browser.", "NotSupportedError");
  }

  const attempts: DisplayMediaStreamOptions[] = [
    { video: true, audio: false },
    { video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
  ];

  let lastErr: unknown;
  for (const opts of attempts) {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(opts);
      if (stream.getVideoTracks().length > 0) return stream;
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      lastErr = err;
      if (err instanceof DOMException && err.name === "NotAllowedError") throw err;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new DOMException("Could not start screen sharing.", "NotSupportedError");
}
