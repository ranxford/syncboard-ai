"use client";

import { useState, type DragEvent } from "react";
import { AlertTriangle, Plus, ShieldCheck } from "lucide-react";
import type { Column, PresenceUser, Task } from "@/lib/types";
import { isReviewColumn } from "@/lib/columns";
import { TaskCard } from "./TaskCard";
import { ReviewColumnHeader } from "./ReviewColumnHeader";

export function BoardColumn({
  column,
  done = false,
  review = false,
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
  canAddTask = false,
  projectId,
  projectRequirements = "",
  reviewAnalysisRaw,
  isAdmin = false,
}: {
  column: Column;
  done?: boolean;
  review?: boolean;
  visibleTasks?: Task[];
  filtering?: boolean;
  watchersByTask: Record<string, PresenceUser[]>;
  draggingId: string | null;
  onCardClick: (task: Task) => void;
  canAddTask?: boolean;
  onAddTask: (columnId: string) => void;
  onDragStart: (taskId: string, e: DragEvent) => void;
  onDragEnd: () => void;
  onDropBeforeTask: (columnId: string, targetTaskId: string) => void;
  onDropToEnd: (columnId: string) => void;
  projectId?: string;
  projectRequirements?: string;
  reviewAnalysisRaw?: string;
  isAdmin?: boolean;
}) {
  const [over, setOver] = useState(false);
  const overLimit = column.wipLimit != null && column.tasks.length > column.wipLimit;
  const tasks = visibleTasks ?? column.tasks;
  const isReview = review || isReviewColumn(column.name);
  const accent = done ? "#22c55e" : isReview ? "#a78bfa" : overLimit ? "#f59e0b" : "#2a9d8f";

  return (
    <div
      className={`board-column ${isReview ? "board-column-review ring-1 ring-violet-500/20" : ""}`}
      style={isReview ? { background: "linear-gradient(180deg, rgba(139,92,246,0.06) 0%, transparent 120px)" } : undefined}
    >
      <div className={`board-column-header ${isReview ? "border-b border-violet-500/15" : ""}`}>
        <div className="flex min-w-0 items-center gap-2">
          {isReview ? (
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-violet-400" />
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          )}
          <h3 className={`truncate text-[13px] font-semibold ${isReview ? "text-violet-100" : "text-gray-200"}`}>
            {column.name}
          </h3>
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
        {canAddTask && (
          <button
            type="button"
            onClick={() => onAddTask(column.id)}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
            title="Add task"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {isReview && projectId && (
        <ReviewColumnHeader
          projectId={projectId}
          requirements={projectRequirements}
          reviewAnalysisRaw={reviewAnalysisRaw}
          isAdmin={isAdmin}
        />
      )}

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
          over
            ? isReview
              ? "rounded-b-lg bg-violet-500/[0.08] ring-1 ring-inset ring-violet-500/25"
              : "rounded-b-lg bg-brand-500/[0.06] ring-1 ring-inset ring-brand-500/20"
            : ""
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
              inReview={isReview}
              watchers={watchersByTask[task.id] ?? []}
              onClick={() => onCardClick(task)}
              onDragStart={(e) => onDragStart(task.id, e)}
              onDragEnd={onDragEnd}
              dragging={draggingId === task.id}
            />
          </div>
        ))}
        {tasks.length === 0 && (
          <p className={`px-2 py-6 text-center text-xs ${isReview ? "text-violet-400/60" : "text-gray-600"}`}>
            {filtering ? "No matching tasks" : isReview ? "Drop work here for DeepSeek review" : "Drop tasks here"}
          </p>
        )}
      </div>
    </div>
  );
}
