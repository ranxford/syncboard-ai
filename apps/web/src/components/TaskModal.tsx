"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { useBoard } from "@/store/board";
import { useEscape } from "@/lib/useEscape";
import type { Member, Priority, Task } from "@/lib/types";

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}
function fromDateInput(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T17:00:00`).toISOString();
}

export function TaskModal({
  task,
  columnId,
  members,
  onClose,
}: {
  task: Task | null;
  columnId: string | null;
  members: Member[];
  onClose: () => void;
}) {
  const { createTask, updateTask, deleteTask } = useBoard();
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId ?? "");
  const [estimate, setEstimate] = useState<string>(task?.estimateHours?.toString() ?? "");
  const [dueDate, setDueDate] = useState<string>(toDateInput(task?.dueDate ?? null));
  const [busy, setBusy] = useState(false);

  useEscape(onClose);

  useEffect(() => {
    if (task) getSocket().emit("task:focus", task.id);
    return () => {
      getSocket().emit("task:focus", null);
    };
  }, [task]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      assigneeId: assigneeId || null,
      estimateHours: estimate ? Number(estimate) : null,
      dueDate: fromDateInput(dueDate),
    };
    try {
      if (isEdit && task) await updateTask(task.id, payload);
      else if (columnId) await createTask(columnId, payload);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!task) return;
    setBusy(true);
    try {
      await deleteTask(task.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass card-shadow w-full max-w-lg rounded-2xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-50">{isEdit ? "Edit task" : "New task"}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Description</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more detail…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Priority</label>
              <select
                className="input capitalize"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="bg-ink-800 capitalize">
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Assignee</label>
              <select
                className="input"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="" className="bg-ink-800">
                  Unassigned
                </option>
                {members.map((m) => (
                  <option key={m.id} value={m.id} className="bg-ink-800">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Estimate (hours)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="input"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="e.g. 4"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Due date</label>
              <input
                type="date"
                className="input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {isEdit ? (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="btn inline-flex items-center gap-1.5 bg-red-500/10 text-red-300 hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? "Saving…" : isEdit ? "Save changes" : "Create task"}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
