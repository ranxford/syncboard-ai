"use client";

import type { RefObject } from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { fitBoardZoom, formatBoardZoom } from "@/lib/boardZoom";
import { useBoardZoom } from "@/store/boardZoom";

export function BoardZoomControls({
  projectId,
  columnCount,
  viewportRef,
}: {
  projectId: string;
  columnCount: number;
  viewportRef: RefObject<HTMLElement | null>;
}) {
  const level = useBoardZoom((s) => s.get(projectId));
  const zoomIn = useBoardZoom((s) => s.zoomIn);
  const zoomOut = useBoardZoom((s) => s.zoomOut);
  const reset = useBoardZoom((s) => s.reset);
  const setZoom = useBoardZoom((s) => s.set);

  function fit() {
    const width = viewportRef.current?.clientWidth ?? window.innerWidth;
    setZoom(projectId, fitBoardZoom(columnCount, width));
  }

  return (
    <div
      className="card flex items-center gap-0.5 rounded-xl p-1 shadow-soft"
      role="group"
      aria-label="Board zoom"
    >
      <button
        type="button"
        onClick={() => zoomOut(projectId)}
        className="btn-ghost rounded-lg px-2 py-1.5"
        title="Zoom out (Ctrl −)"
        aria-label="Zoom out"
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => reset(projectId)}
        className="min-w-[3.25rem] rounded-lg px-2 py-1.5 text-xs font-medium tabular-nums text-gray-300 transition-colors hover:bg-white/10 hover:text-gray-100"
        title="Reset zoom (Ctrl 0)"
        aria-label={`Zoom level ${formatBoardZoom(level)}. Click to reset.`}
      >
        {formatBoardZoom(level)}
      </button>
      <button
        type="button"
        onClick={() => zoomIn(projectId)}
        className="btn-ghost rounded-lg px-2 py-1.5"
        title="Zoom in (Ctrl +)"
        aria-label="Zoom in"
      >
        <Plus className="h-4 w-4" />
      </button>
      <span className="mx-0.5 h-5 w-px bg-white/10" aria-hidden />
      <button
        type="button"
        onClick={fit}
        className="btn-ghost rounded-lg px-2 py-1.5"
        title="Fit all columns"
        aria-label="Fit all columns in view"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
      {level !== 1 && (
        <button
          type="button"
          onClick={() => reset(projectId)}
          className="btn-ghost rounded-lg px-2 py-1.5"
          title="Reset to 100%"
          aria-label="Reset zoom to 100%"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
