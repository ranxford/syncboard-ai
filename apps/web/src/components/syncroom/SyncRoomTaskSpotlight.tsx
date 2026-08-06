"use client";

import { useBoard } from "@/store/board";
import { useSyncRoom } from "@/store/call";
import { PRIORITY_STYLES } from "@/lib/ui";

/** Pinned task card shown during a task-scoped SyncRoom. */
export function SyncRoomTaskSpotlight() {
  const contextTask = useSyncRoom((s) => s.contextTask);
  const phase = useSyncRoom((s) => s.phase);
  const board = useBoard((s) => s.board);

  if (!contextTask || phase !== "in-call" || !board) return null;

  const task = board.columns.flatMap((c) => c.tasks).find((t) => t.id === contextTask.id);
  if (!task) return null;

  const col = board.columns.find((c) => c.id === task.columnId);
  const prio = PRIORITY_STYLES[task.priority];
  const assignee = board.members.find((m) => m.id === task.assigneeId);

  return (
    <div className="border-b border-brand-500/30 bg-brand-500/10 px-3 py-2.5">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-300">
        In discussion
      </p>
      <p className="text-sm font-semibold text-gray-50">{task.title}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: prio.dot }} />
          {task.priority}
        </span>
        {col && <span>{col.name}</span>}
        {assignee && <span>→ {assignee.name}</span>}
      </div>
      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-gray-400">{task.description}</p>
      )}
    </div>
  );
}
