"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, Trash2, Video, X, Radio } from "lucide-react";
import { CommentBody } from "@/components/CommentBody";
import { getSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import { useBoard } from "@/store/board";
import { useAuth } from "@/store/auth";
import { useEscape } from "@/lib/useEscape";
import { relativeTime } from "@/lib/ui";
import type { Comment, Member, Priority, SyncRoomSessionSummary, Task } from "@/lib/types";
import { suggestedLabelsForField } from "@/lib/projectFields";
import { Avatar } from "./Avatar";
import { SyncRoomPresencePrompt } from "./syncroom/SyncRoomPresencePrompt";
import { useSyncRoom } from "@/store/call";

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
  const { createTask, updateTask, deleteTask, board } = useBoard();
  const currentUser = useAuth((s) => s.user);
  const isEdit = !!task;
  const fieldSuggestions = suggestedLabelsForField(board?.project.field);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId ?? "");
  const [estimate, setEstimate] = useState<string>(task?.estimateHours?.toString() ?? "");
  const [dueDate, setDueDate] = useState<string>(toDateInput(task?.dueDate ?? null));
  const [labels, setLabels] = useState<string[]>(task?.labels ?? []);
  const [labelInput, setLabelInput] = useState("");
  const [busy, setBusy] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [sessions, setSessions] = useState<SyncRoomSessionSummary[]>([]);

  useEscape(onClose);

  useEffect(() => {
    if (!task) return;
    const socket = getSocket();
    socket.emit("task:focus", { taskId: task.id, taskTitle: task.title });

    api.getComments(task.id).then(({ comments }) => setComments(comments)).catch(() => {});
    api.getTaskSyncRoomSessions(task.id).then(({ sessions }) => setSessions(sessions)).catch(() => {});

    const onAdded = (p: { taskId: string; comment: Comment }) => {
      if (p.taskId === task.id) setComments((c) => (c.some((x) => x.id === p.comment.id) ? c : [...c, p.comment]));
    };
    const onDeleted = (p: { taskId: string; commentId: string }) => {
      if (p.taskId === task.id) setComments((c) => c.filter((x) => x.id !== p.commentId));
    };
    socket.on("comment:added", onAdded);
    socket.on("comment:deleted", onDeleted);

    return () => {
      socket.emit("task:focus", null);
      socket.off("comment:added", onAdded);
      socket.off("comment:deleted", onDeleted);
    };
  }, [task]);

  function addLabel() {
    const v = labelInput.trim();
    if (v && !labels.includes(v)) setLabels([...labels, v]);
    setLabelInput("");
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !commentBody.trim()) return;
    const body = commentBody.trim();
    setCommentBody("");
    try {
      const { comment } = await api.addComment(task.id, body);
      setComments((c) => (c.some((x) => x.id === comment.id) ? c : [...c, comment]));
    } catch {
      setCommentBody(body);
    }
  }

  async function removeComment(id: string) {
    setComments((c) => c.filter((x) => x.id !== id));
    try {
      await api.deleteComment(id);
    } catch {
      /* will resync on next open */
    }
  }

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
      labels,
    };
    try {
      if (isEdit && task) await updateTask(task.id, payload);
      else if (columnId) await createTask(columnId, payload);
      onClose();
    } catch {
      // Failure already surfaced via toast; keep the modal open so edits aren't lost.
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
    } catch {
      // Failure already surfaced via toast.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card card-shadow max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-50">{isEdit ? "Edit task" : "New task"}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isEdit && task && (
          <>
            <SyncRoomPresencePrompt taskId={task.id} taskTitle={task.title} />
            <button
              type="button"
              onClick={() => {
                onClose();
                void useSyncRoom.getState().openLobby({ task: { id: task.id, title: task.title } });
              }}
              className="btn-ghost mb-4 w-full border-brand-500/30 text-brand-200"
            >
              <Video className="h-4 w-4" /> Live discussion (SyncRoom)
            </button>

            {sessions.length > 0 && (
              <div className="mb-4 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-300">
                  <Radio className="h-3.5 w-3.5" /> Past SyncRoom discussions
                </h3>
                <ul className="space-y-2">
                  {sessions.slice(0, 3).map((s) => (
                    <li key={s.id} className="text-xs text-gray-300">
                      <span className="text-gray-500">{relativeTime(s.startedAt)}</span>
                      {s.summary ? (
                        <p className="mt-0.5 line-clamp-2 text-gray-200">{s.summary}</p>
                      ) : (
                        <p className="mt-0.5 text-gray-500">{s.eventCount} events recorded</p>
                      )}
                      {s.appliedAt && (
                        <span className="mt-1 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
                          Outcomes applied
                        </span>
                      )}
                      {s.artifacts && s.artifacts.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {s.artifacts.map((a) => (
                            <li key={a.id}>
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-300 hover:underline"
                              >
                                {a.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

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

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Labels</label>
            {labels.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {labels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-300"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => setLabels(labels.filter((l) => l !== label))}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              className="input"
              placeholder="Add a label and press Enter"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addLabel();
                }
              }}
            />
            {fieldSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {fieldSuggestions
                  .filter((s) => !labels.includes(s))
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setLabels([...labels, s])}
                      className="rounded-full border border-dashed border-white/15 px-2 py-0.5 text-[11px] text-gray-400 hover:border-brand-500/40 hover:text-brand-200"
                    >
                      + {s}
                    </button>
                  ))}
              </div>
            )}
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

        {isEdit && (
          <div className="mt-6 border-t border-white/10 pt-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Comments ({comments.length})
            </h3>

            <div className="mb-3 max-h-48 space-y-3 overflow-y-auto">
              {comments.length === 0 && (
                <p className="text-sm text-gray-500">No comments yet. Start the discussion.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="group flex items-start gap-2.5">
                  <Avatar name={c.user.name} color={c.user.avatarColor} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-100">{c.user.name}</span>
                      <span className="text-[10px] text-gray-500">{relativeTime(c.createdAt)}</span>
                      {c.user.id === currentUser?.id && (
                        <button
                          onClick={() => removeComment(c.id)}
                          className="ml-auto rounded text-gray-500 opacity-70 transition-opacity hover:text-red-300 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                          title="Delete comment"
                          aria-label={`Delete comment by ${c.user.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-gray-300">
                      <CommentBody body={c.body} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendComment} className="flex items-center gap-2">
              <input
                className="input flex-1"
                placeholder="Write a comment…"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
              />
              <button type="submit" disabled={!commentBody.trim()} className="btn-primary px-3 py-2">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
