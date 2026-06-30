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

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-white/[0.06] bg-ink-900/50">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: done ? "#22c55e" : overLimit ? "#f59e0b" : "#6366f1" }}
          />
          <h3 className="text-sm font-semibold text-gray-200">{column.name}</h3>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs tabular-nums text-gray-400">
            {filtering
              ? `${tasks.length}/${column.tasks.length}`
              : `${column.tasks.length}${column.wipLimit != null ? `/${column.wipLimit}` : ""}`}
          </span>
          {overLimit && (
            <span title="Over WIP limit">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            </span>
          )}
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200"
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
        className={`flex min-h-[120px] flex-1 flex-col gap-2 rounded-b-2xl border-2 border-dashed p-2 transition-colors ${
          over ? "border-brand-500/60 bg-brand-500/5" : "border-transparent"
        }`}
      >
        {tasks.map((task) => (
          <div
            key={task.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOver(false);
              onDropBeforeTask(column.id, task.id);
            }}
          >
            <TaskCard
              task={task}
              done={done}
              watchers={watchersByTask[task.id] ?? []}
              dragging={draggingId === task.id}
              onClick={() => onCardClick(task)}
              onDragStart={(e) => onDragStart(task.id, e)}
              onDragEnd={onDragEnd}
            />
          </div>
        ))}

        {tasks.length === 0 &&
          (filtering ? (
            <p className="py-6 text-center text-xs text-gray-600">No matching tasks</p>
          ) : (
            <button
              onClick={() => onAddTask(column.id)}
              className="rounded-lg border border-dashed border-white/10 py-6 text-xs text-gray-500 hover:border-white/20 hover:text-gray-300"
            >
              + Add a task
            </button>
          ))}
      </div>
    </div>
  );
}
