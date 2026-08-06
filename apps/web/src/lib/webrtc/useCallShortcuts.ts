"use client";

import { useEffect } from "react";
import { useCall } from "@/store/call";

/** M mute, V video, S screen share, Esc leave/minimize. */
export function useCallShortcuts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const call = useCall.getState();
      if (call.phase !== "in-call") return;

      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        call.toggleMic();
      } else if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        call.toggleCam();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        void call.toggleScreen();
      } else if (e.key === "Escape") {
        if (call.viewMode === "fullscreen") call.setViewMode("expanded");
        else call.setViewMode("minimized");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
