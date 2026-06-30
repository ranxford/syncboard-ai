"use client";

import { type DragEvent } from "react";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Clock } from "lucide-react";
import type { PresenceUser, Task } from "@/lib/types";
import { PRIORITY_STYLES, dueLabel } from "@/lib/ui";
import { Avatar } from "./Avatar";

export function TaskCard({
  task,
  done = false,
  watchers,
  onClick,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  task: Task;
  done?: boolean;
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
    <motion.div
      layout
      draggable
      onDragStartCapture={onDragStart}
      onDragEndCapture={onDragEnd}
      onClick={onClick}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: dragging ? 0.4 : 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`group relative cursor-pointer rounded-xl border bg-ink-800 p-3 card-shadow transition-colors ${
        othersWatching ? "border-brand-500/60" : "border-white/10 hover:border-white/20"
      } ${done ? "opacity-70" : ""}`}
    >
      {othersWatching && (
        <div className="absolute -right-1.5 -top-1.5 flex -space-x-1.5">
          {watchers.slice(0, 3).map((w) => (
            <div key={w.userId} className="relative">
              <Avatar name={w.name} color={w.avatarColor} size={20} />
              <span
                className="absolute inset-0 animate-pulse-ring rounded-full"
                style={{ boxShadow: `0 0 0 2px ${w.avatarColor}` }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mb-2 flex items-start justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${prio.className}`}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: prio.dot }} />
          {prio.label}
        </span>
        {task.assignee && (
          <Avatar name={task.assignee.name} color={task.assignee.avatarColor} size={22} />
        )}
      </div>

      <p
        className={`flex items-start gap-1.5 text-sm font-medium leading-snug ${
          done ? "text-gray-400 line-through decoration-gray-600" : "text-gray-100"
        }`}
      >
        {done && <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />}
        <span>{task.title}</span>
      </p>

      {task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-medium text-brand-300"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {(due || task.estimateHours) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
          {due && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
                due.tone === "over"
                  ? "bg-red-500/15 text-red-300"
                  : due.tone === "soon"
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-white/5 text-gray-400"
              }`}
            >
              <Calendar className="h-3 w-3" /> {due.text}
            </span>
          )}
          {task.estimateHours != null && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-gray-400">
              <Clock className="h-3 w-3" /> {task.estimateHours}h
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
