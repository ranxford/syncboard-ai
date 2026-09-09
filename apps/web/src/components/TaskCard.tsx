"use client";

import { type DragEvent } from "react";
import { Calendar, CheckCircle2, Clock, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import type { PresenceUser, Task } from "@/lib/types";
import { PRIORITY_STYLES, dueLabel } from "@/lib/ui";
import { Avatar } from "./Avatar";

export function TaskCard({
  task,
  done = false,
  inReview = false,
  watchers,
  onClick,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  task: Task;
  done?: boolean;
  inReview?: boolean;
  watchers: PresenceUser[];
  onClick: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  const prio = PRIORITY_STYLES[task.priority];
  const due = dueLabel(task.dueDate);
  const othersWatching = watchers.length > 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`task-card group relative ${othersWatching ? "border-brand-400/30" : ""} ${
        dragging ? "opacity-45" : ""
      } ${done ? "opacity-75" : ""} ${
        inReview && task.reviewStatus === "failed"
          ? "border-red-500/30"
          : inReview && task.reviewStatus === "passed"
            ? "border-emerald-500/25"
            : inReview
              ? "border-violet-500/20"
              : ""
      }`}
    >
      {othersWatching && (
        <div className="absolute -right-1 -top-1 flex -space-x-1">
          {watchers.slice(0, 3).map((w) => (
            <Avatar key={w.userId} name={w.name} color={w.avatarColor} size={20} />
          ))}
        </div>
      )}

      <div className="mb-2 flex items-start justify-between gap-2">
        <p
          className={`min-w-0 flex-1 text-[13px] font-medium leading-snug ${
            done ? "text-gray-500 line-through decoration-gray-600" : "text-gray-100"
          }`}
        >
          {done && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-400" />}
          {task.title}
        </p>
        {task.assignee && (
          <Avatar name={task.assignee.name} color={task.assignee.avatarColor} size={22} />
        )}
      </div>

      {task.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span key={label} className="pill text-[10px]">
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${prio.className}`}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: prio.dot }} />
          {prio.label}
        </span>
        {due && (
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${
              due.tone === "over"
                ? "bg-red-500/12 text-red-300"
                : due.tone === "soon"
                  ? "bg-amber-500/12 text-amber-300"
                  : "text-gray-500"
            }`}
          >
            <Calendar className="h-3 w-3" />
            {due.text}
          </span>
        )}
        {task.estimateHours != null && task.estimateHours > 0 && (
          <span className="inline-flex items-center gap-1 text-gray-500">
            <Clock className="h-3 w-3" />
            {task.estimateHours}h
          </span>
        )}
        {inReview && task.reviewStatus && task.reviewStatus !== "none" && (
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${
              task.reviewStatus === "passed"
                ? "bg-emerald-500/12 text-emerald-300"
                : task.reviewStatus === "failed"
                  ? "bg-red-500/12 text-red-300"
                  : task.reviewStatus === "pending"
                    ? "bg-violet-500/12 text-violet-300"
                    : "text-gray-500"
            }`}
            title={task.reviewFeedback ?? undefined}
          >
            {task.reviewStatus === "pending" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : task.reviewStatus === "passed" ? (
              <ShieldCheck className="h-3 w-3" />
            ) : task.reviewStatus === "failed" ? (
              <ShieldAlert className="h-3 w-3" />
            ) : null}
            DeepSeek {task.reviewStatus}
          </span>
        )}
      </div>
    </div>
  );
}
