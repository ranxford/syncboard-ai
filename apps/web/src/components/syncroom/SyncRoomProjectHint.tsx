"use client";

import { Radio } from "lucide-react";
import { useBoard } from "@/store/board";
import { useSyncRoom } from "@/store/call";

/** Encourages task-scoped SyncRoom when a session is already running. */
export function SyncRoomProjectHint() {
  const roster = useSyncRoom((s) => s.roster);
  const phase = useSyncRoom((s) => s.phase);
  const board = useBoard((s) => s.board);

  if (phase !== "idle" || roster.length === 0 || !board) return null;

  const names = roster.map((p) => p.name).join(", ");
  const taskFocus = roster.find((p) => p.focusTaskTitle);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-500/20 bg-brand-500/5 px-4 py-2 text-xs text-brand-200 md:px-6">
      <span>
        <Radio className="mr-1 inline h-3.5 w-3.5" />
        SyncRoom active ({names})
        {taskFocus?.focusTaskTitle ? (
          <> — focused on “{taskFocus.focusTaskTitle}”</>
        ) : (
          <> — open a task and use <span className="font-medium">Live discussion</span> for task context</>
        )}
      </span>
      <button
        type="button"
        onClick={() => void useSyncRoom.getState().openLobby()}
        className="btn-primary shrink-0 py-1 text-xs"
      >
        Join SyncRoom
      </button>
    </div>
  );
}
