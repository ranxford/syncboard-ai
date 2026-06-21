"use client";

import { useMemo, useState } from "react";
import { getSocket } from "@/lib/socket";
import { useBoard } from "@/store/board";
import type { PresenceUser, Task } from "@/lib/types";
import { BoardColumn } from "./BoardColumn";

export function KanbanBoard({
  onEditTask,
  onAddTask,
}: {
  onEditTask: (task: Task) => void;
  onAddTask: (columnId: string) => void;
}) {
  const board = useBoard((s) => s.board);
  const presence = useBoard((s) => s.presence);
  const moveTask = useBoard((s) => s.moveTask);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const watchersByTask = useMemo(() => {
    const map: Record<string, PresenceUser[]> = {};
    for (const u of presence) {
      if (u.focusedTaskId) (map[u.focusedTaskId] ??= []).push(u);
    }
    return map;
  }, [presence]);

  const doneColumnIds = useMemo(() => {
    if (!board) return new Set<string>();
    const maxOrder = Math.max(...board.columns.map((c) => c.order));
    return new Set(
      board.columns
        .filter(
          (c) =>
            /done|complete|shipped|closed|resolved/i.test(c.name) ||
            (board.columns.length > 1 && c.order === maxOrder),
        )
        .map((c) => c.id),
    );
  }, [board]);

  if (!board) return null;

  function siblingsExcludingDragged(columnId: string) {
    const col = board!.columns.find((c) => c.id === columnId);
    if (!col) return [];
    return col.tasks.filter((t) => t.id !== draggingId);
  }

  function handleDropBeforeTask(columnId: string, targetTaskId: string) {
    if (!draggingId || draggingId === targetTaskId) {
      setDraggingId(null);
      return;
    }
    const siblings = siblingsExcludingDragged(columnId);
    const index = siblings.findIndex((t) => t.id === targetTaskId);
    moveTask(draggingId, columnId, index === -1 ? siblings.length : index);
    setDraggingId(null);
  }

  function handleDropToEnd(columnId: string) {
    if (!draggingId) return;
    const siblings = siblingsExcludingDragged(columnId);
    moveTask(draggingId, columnId, siblings.length);
    setDraggingId(null);
  }

  function handleDragStart(taskId: string) {
    setDraggingId(taskId);
    getSocket().emit("task:focus", taskId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    getSocket().emit("task:focus", null);
  }

  return (
    <div className="flex h-full gap-4 overflow-x-auto px-4 pb-4 md:px-6">
      {board.columns.map((column) => (
        <BoardColumn
          key={column.id}
          column={column}
          done={doneColumnIds.has(column.id)}
          watchersByTask={watchersByTask}
          draggingId={draggingId}
          onCardClick={onEditTask}
          onAddTask={onAddTask}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDropBeforeTask={handleDropBeforeTask}
          onDropToEnd={handleDropToEnd}
        />
      ))}
    </div>
  );
}
