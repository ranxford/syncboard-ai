import { useEffect } from "react";
import { useBoardZoom } from "@/store/boardZoom";

/** Ctrl/Cmd + +, −, 0 for zoom on the board page. */
export function useBoardZoomShortcuts(projectId: string) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
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

      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        useBoardZoom.getState().zoomIn(projectId);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        useBoardZoom.getState().zoomOut(projectId);
      } else if (e.key === "0") {
        e.preventDefault();
        useBoardZoom.getState().reset(projectId);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [projectId]);
}
