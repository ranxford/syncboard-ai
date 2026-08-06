"use client";

import { useRef, useEffect, useState } from "react";
import { Pencil, Eraser } from "lucide-react";
import type { WhiteboardStroke } from "@/store/call";
import { useSyncRoom } from "@/store/call";

const COLORS = ["#2a9d8f", "#34d399", "#fbbf24", "#f87171", "#0e7490"];

export function SyncRoomWhiteboard({ forceOpen = false }: { forceOpen?: boolean }) {
  const phase = useSyncRoom((s) => s.phase);
  const strokes = useSyncRoom((s) => s.whiteboardStrokes);
  const setStrokes = useSyncRoom((s) => s.setWhiteboardStrokes);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [color, setColor] = useState(COLORS[0]);
  const [open, setOpen] = useState(forceOpen);
  const showCanvas = forceOpen || open;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showCanvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineWidth = 2.5;
    for (const s of strokes) {
      ctx.strokeStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
  }, [strokes, showCanvas]);

  if (phase !== "in-call") return null;

  function pos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onDown(e: React.MouseEvent<HTMLCanvasElement>) {
    drawing.current = true;
    last.current = pos(e);
  }

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const p = pos(e);
    const stroke: WhiteboardStroke = {
      x1: last.current.x,
      y1: last.current.y,
      x2: p.x,
      y2: p.y,
      color,
    };
    last.current = p;
    setStrokes([...strokes, stroke]);
  }

  function onUp() {
    drawing.current = false;
  }

  return (
    <div className={forceOpen ? "px-3 py-2" : "border-t border-white/10 bg-white/[0.02] px-3 py-2"}>
      {!forceOpen && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-300"
        >
          <Pencil className="h-3 w-3" /> Whiteboard {open ? "▾" : "▸"}
        </button>
      )}
      {showCanvas && (
        <>
          <div className="mb-2 flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full border-2 ${color === c ? "border-white" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <button
              type="button"
              onClick={() => setStrokes([])}
              className="ml-auto rounded p-1 text-gray-500 hover:bg-white/10"
              title="Clear"
            >
              <Eraser className="h-3.5 w-3.5" />
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={320}
            height={120}
            className="w-full cursor-crosshair rounded-lg border border-white/10 bg-ink-900"
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={onUp}
          />
        </>
      )}
    </div>
  );
}
