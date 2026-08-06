"use client";

import { useState } from "react";
import { useBoard } from "@/store/board";
import { Avatar } from "./Avatar";

/** Online presence only — inviting happens in Community / Team panel. */
export function PresenceBar({
  onOpenTask,
}: {
  projectId?: string;
  onOpenTask?: (taskId: string) => void;
}) {
  const presence = useBoard((s) => s.presence);
  const board = useBoard((s) => s.board);
  const [hovered, setHovered] = useState<string | null>(null);

  function taskTitle(taskId: string | null): string | null {
    if (!taskId || !board) return null;
    return board.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId)?.title ?? null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center -space-x-2">
        {presence.length === 0 && <span className="text-xs text-gray-500">No one else here</span>}
        {presence.slice(0, 6).map((u) => {
          const focused = taskTitle(u.focusedTaskId);
          return (
            <div
              key={u.userId}
              className="relative"
              onMouseEnter={() => setHovered(u.userId)}
              onMouseLeave={() => setHovered(null)}
            >
              <button
                type="button"
                onClick={() => u.focusedTaskId && onOpenTask?.(u.focusedTaskId)}
                className={focused ? "cursor-pointer" : "cursor-default"}
                title={focused ? `${u.name} · ${focused}` : u.name}
              >
                <Avatar name={u.name} color={u.avatarColor} size={30} ring />
              </button>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-950 bg-emerald-400" />
              {hovered === u.userId && focused && (
                <div className="glass absolute left-1/2 top-full z-50 mt-2 w-44 -translate-x-1/2 rounded-lg px-2 py-1.5 text-center text-[10px] text-gray-200">
                  <span className="font-medium text-gray-100">{u.name}</span>
                  <br />
                  <span className="text-gray-400">{focused}</span>
                </div>
              )}
            </div>
          );
        })}
        {presence.length > 6 && (
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/10 text-xs">
            +{presence.length - 6}
          </span>
        )}
      </div>
    </div>
  );
}
