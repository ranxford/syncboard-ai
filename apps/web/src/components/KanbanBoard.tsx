"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { getSocket } from "@/lib/socket";
import { useBoard } from "@/store/board";
import { useAuth } from "@/store/auth";
import type { PresenceUser, Task } from "@/lib/types";
import { BoardColumn } from "./BoardColumn";
import {
  BoardFilters,
  EMPTY_FILTERS,
  filtersFromSearch,
  filtersToSearch,
  isFilterActive,
  type BoardFilterState,
} from "./BoardFilters";

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
  const currentUserId = useAuth((s) => s.user?.id);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<BoardFilterState>(EMPTY_FILTERS);

  // Hydrate filters from the URL on mount (kept out of the initial render to
  // avoid an SSR/client hydration mismatch).
  useEffect(() => {
    const fromUrl = filtersFromSearch(window.location.search);
    if (isFilterActive(fromUrl)) setFilters(fromUrl);
  }, []);

  // Mirror active filters into the URL so a reload or shared link restores them.
  const applyFilters = useCallback((next: BoardFilterState) => {
    setFilters(next);
    const qs = filtersToSearch(next);
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, []);

  const allLabels = useMemo(() => {
    if (!board) return [] as string[];
    const set = new Set<string>();
    for (const c of board.columns) for (const t of c.tasks) for (const l of t.labels) set.add(l);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [board]);

  const matchesFilters = useMemo(() => {
    return (task: Task) => {
      if (filters.labels.length > 0 && !filters.labels.some((l) => task.labels.includes(l))) {
        return false;
      }
      if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
        return false;
      }
      if (filters.assigneeId === "unassigned") return task.assigneeId == null;
      if (filters.assigneeId != null) return task.assigneeId === filters.assigneeId;
      return true;
    };
  }, [filters]);

  const { totalCount, shownCount } = useMemo(() => {
    if (!board) return { totalCount: 0, shownCount: 0 };
    let total = 0;
    let shown = 0;
    for (const c of board.columns) {
      for (const t of c.tasks) {
        total += 1;
        if (matchesFilters(t)) shown += 1;
      }
    }
    return { totalCount: total, shownCount: shown };
  }, [board, matchesFilters]);

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

  function handleDragStart(taskId: string, e: DragEvent) {
    setDraggingId(taskId);
    // Firefox/Safari require dataTransfer to be initialized or the drag never starts.
    try {
      e.dataTransfer.setData("text/plain", taskId);
      e.dataTransfer.effectAllowed = "move";
    } catch {
      /* some browsers throw if accessed outside a real drag */
    }
    getSocket().emit("task:focus", taskId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    getSocket().emit("task:focus", null);
  }

  const filtering = isFilterActive(filters);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <BoardFilters
        allLabels={allLabels}
        members={board.members}
        currentUserId={currentUserId}
        filters={filters}
        onChange={applyFilters}
        shown={shownCount}
        total={totalCount}
      />
      <div className="flex flex-1 gap-4 overflow-x-auto px-4 pb-4 pt-4 md:px-6">
        {board.columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            done={doneColumnIds.has(column.id)}
            visibleTasks={filtering ? column.tasks.filter(matchesFilters) : column.tasks}
            filtering={filtering}
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
    </div>
  );
}
