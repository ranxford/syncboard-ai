/** True when a video track comes from getDisplayMedia (screen / window / tab). */
export function isScreenShareTrack(track: MediaStreamTrack): boolean {
  if (track.kind !== "video") return false;
  const settings = track.getSettings() as MediaTrackSettings & { displaySurface?: string };
  if (settings.displaySurface) return true;
  const label = track.label.toLowerCase();
  return /screen|window|display|tab|monitor|share|desktop/.test(label);
}

export function cameraTrackFromStream(stream: MediaStream | null): MediaStreamTrack | null {
  if (!stream) return null;
  return stream.getVideoTracks().find((t) => !isScreenShareTrack(t)) ?? null;
}

export function screenTrackFromStream(stream: MediaStream | null): MediaStreamTrack | null {
  if (!stream) return null;
  return stream.getVideoTracks().find((t) => isScreenShareTrack(t)) ?? null;
}
