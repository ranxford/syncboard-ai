"use client";

import { useState, type DragEvent } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import type { Column, PresenceUser, Task } from "@/lib/types";
import { TaskCard } from "./TaskCard";

export function BoardColumn({
  column,
  done = false,
  visibleTasks,
  filtering = false,
  watchersByTask,
  draggingId,
  onCardClick,
  onAddTask,
  onDragStart,
  onDragEnd,
  onDropBeforeTask,
  onDropToEnd,
}: {
  column: Column;
  done?: boolean;
  visibleTasks?: Task[];
  filtering?: boolean;
  watchersByTask: Record<string, PresenceUser[]>;
  draggingId: string | null;
  onCardClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
  onDragStart: (taskId: string, e: DragEvent) => void;
  onDragEnd: () => void;
  onDropBeforeTask: (columnId: string, targetTaskId: string) => void;
  onDropToEnd: (columnId: string) => void;
}) {
  const [over, setOver] = useState(false);
  const overLimit = column.wipLimit != null && column.tasks.length > column.wipLimit;
  const tasks = visibleTasks ?? column.tasks;
  const accent = done ? "#22c55e" : overLimit ? "#f59e0b" : "#2a9d8f";

  return (
    <div className="board-column">
      <div className="board-column-header">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          <h3 className="truncate text-[13px] font-semibold text-gray-200">{column.name}</h3>
          <span className="pill tabular-nums">
            {filtering
              ? `${tasks.length}/${column.tasks.length}`
              : `${column.tasks.length}${column.wipLimit != null ? ` / ${column.wipLimit}` : ""}`}
          </span>
          {overLimit && (
            <span title="Over WIP limit">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAddTask(column.id)}
          className="rounded p-1 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
          title="Add task"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onDropToEnd(column.id);
        }}
        className={`flex min-h-[140px] flex-1 flex-col gap-2 p-2 transition-colors ${
          over ? "rounded-b-lg bg-brand-500/[0.06] ring-1 ring-inset ring-brand-500/20" : ""
        }`}
      >
        {tasks.map((task) => (
          <div
            key={task.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDropBeforeTask(column.id, task.id);
            }}
          >
            <TaskCard
              task={task}
              done={done}
              watchers={watchersByTask[task.id] ?? []}
              onClick={() => onCardClick(task)}
              onDragStart={(e) => onDragStart(task.id, e)}
              onDragEnd={onDragEnd}
              dragging={draggingId === task.id}
            />
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-gray-600">
            {filtering ? "No matching tasks" : "Drop tasks here"}
          </p>
        )}
      </div>
    </div>
  );
}
