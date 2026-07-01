import { useEffect, useState } from "react";

/** True when the audio track is above a simple volume threshold. */
export function useSpeaking(stream: MediaStream | null, enabled = true): boolean {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!enabled || !stream) {
      setSpeaking(false);
      return;
    }
    const track = stream.getAudioTracks()[0];
    if (!track || !track.enabled) {
      setSpeaking(false);
      return;
    }

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bins = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;

    const tick = () => {
      analyser.getByteFrequencyData(bins);
      const avg = bins.reduce((sum, v) => sum + v, 0) / bins.length;
      setSpeaking(avg > 14);
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      void ctx.close();
    };
  }, [stream, enabled]);

  return speaking;
}
