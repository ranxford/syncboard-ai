"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Clock, LayoutList, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Column, Member, MeetingResult } from "@/lib/types";
import { relativeTime } from "@/lib/ui";
import {
  actionItemsForImport,
  defaultActionColumn,
  formatOutcomeComment,
} from "@/lib/syncRoom/applyOutcomes";
import type { SessionEvent, TaskContext } from "@/lib/syncRoom/sessionLog";
import { useBoard } from "@/store/board";
import { useSyncRoom } from "@/store/call";
import { toast } from "@/store/toast";

function eventIcon(kind: SessionEvent["kind"]): string {
  if (kind.startsWith("task_")) return "📋";
  if (kind === "outcomes_applied") return "✨";
  if (kind === "screen_shared") return "🖥";
  if (kind === "peer_joined" || kind === "peer_left") return "👤";
  return "•";
}

export function SyncRoomWrapUp({
  open,
  sessionLog,
  contextTask,
  projectId,
  columns,
  members,
  onClose,
}: {
  open: boolean;
  sessionLog: SessionEvent[];
  contextTask: TaskContext | null;
  projectId: string;
  columns: Column[];
  members: Member[];
  onClose: () => void;
}) {
  const applyServerBoard = useBoard((s) => s.applyServerBoard);
  const board = useBoard((s) => s.board);
  const sessionId = useSyncRoom((s) => s.sessionId);
  const collaborativeNotes = useSyncRoom((s) => s.collaborativeNotes);
  const whiteboardStrokes = useSyncRoom((s) => s.whiteboardStrokes);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MeetingResult | null>(null);

  const boardEvents = sessionLog.filter((e) => e.kind.startsWith("task_")).length;

  if (!open) return null;

  async function generateSummary() {
    const transcript = [
      contextTask ? `Task discussion: ${contextTask.title}` : "Project SyncRoom session",
      "",
      "Session timeline:",
      ...sessionLog.map((e) => `- ${e.label}`),
      "",
      notes.trim() ? `Facilitator notes:\n${notes.trim()}` : "",
      collaborativeNotes.trim() ? `Live session notes:\n${collaborativeNotes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    setBusy(true);
    try {
      const { result: ai } = await api.summarizeMeeting(transcript);
      setResult(ai);
    } catch {
      toast.error("Couldn't generate the AI summary.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSessionOnly() {
    if (!sessionId) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await api.finalizeSyncRoomSession(sessionId, {
        notes: collaborativeNotes || notes,
        summary: result?.summary,
        decisions: result?.decisions,
        whiteboard: JSON.stringify(whiteboardStrokes),
      });
      onClose();
    } catch {
      toast.error("Couldn't save the session.");
    } finally {
      setBusy(false);
    }
  }

  async function applyToBoard() {
    if (!result) return;
    setBusy(true);
    try {
      const items = actionItemsForImport(
        result,
        members,
        board?.columns.flatMap((c) => c.tasks).map((t) => t.title) ?? [],
      );
      let created = 0;

      if (items.length > 0) {
        const columnId = defaultActionColumn(columns);
        const { board } = await api.importTasks(projectId, columnId, items);
        applyServerBoard(board);
        created = items.length;
      }

      if (contextTask) {
        await api.addComment(contextTask.id, formatOutcomeComment(result));
      }

      if (sessionId) {
        await api.finalizeSyncRoomSession(sessionId, {
          notes: collaborativeNotes || notes,
          summary: result.summary,
          decisions: result.decisions,
          whiteboard: JSON.stringify(whiteboardStrokes),
          applied: true,
        });
      }

      useSyncRoom.getState().logSession(
        "outcomes_applied",
        `Applied ${created} task${created === 1 ? "" : "s"} + summary${contextTask ? ` on “${contextTask.title}”` : ""}`,
      );

      toast.success(
        created > 0
          ? `Board updated — ${created} new task${created === 1 ? "" : "s"} and summary saved.`
          : "Summary and decisions saved to the task.",
      );
      onClose();
    } catch {
      toast.error("Couldn't apply outcomes to the board.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card card-shadow max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-300">Session replay</p>
            <h2 className="text-lg font-semibold text-gray-50">SyncRoom wrap-up</h2>
            {contextTask && (
              <p className="mt-1 text-sm text-gray-400">
                Discussion on <span className="text-gray-200">“{contextTask.title}”</span>
              </p>
            )}
            {boardEvents > 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-300/90">
                <LayoutList className="h-3.5 w-3.5" />
                {boardEvents} board change{boardEvents === 1 ? "" : "s"} captured during this session
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <section className="mb-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Clock className="h-3.5 w-3.5" /> Timeline
          </h3>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            {sessionLog.map((e) => (
              <li key={e.id} className="flex gap-2 text-xs text-gray-300">
                <span className="shrink-0 w-4 text-center">{eventIcon(e.kind)}</span>
                <span className="shrink-0 text-gray-500">{relativeTime(e.at)}</span>
                <span>{e.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <label className="mb-4 block text-xs font-medium text-gray-400">
          Add context for the AI assistant (optional)
          <textarea
            className="input mt-1 min-h-[72px] resize-y"
            placeholder="Key points, blockers, or decisions discussed…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {!result ? (
          <button onClick={() => void generateSummary()} disabled={busy} className="btn-primary w-full">
            <Sparkles className="h-4 w-4" />
            {busy ? "Generating…" : "Generate AI summary & next steps"}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-brand-300">
                <Brain className="h-3.5 w-3.5" /> Summary
              </p>
              <p className="text-sm text-gray-200">{result.summary}</p>
            </div>
            {result.decisions.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-400">Decisions</p>
                <ul className="list-inside list-disc text-sm text-gray-300">
                  {result.decisions.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.actionItems.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-400">Action items → board</p>
                <ul className="space-y-1 text-sm text-gray-300">
                  {result.actionItems.map((a) => (
                    <li key={a.title} className="rounded-lg bg-white/[0.03] px-2 py-1">
                      {a.title}
                      <span className="ml-2 text-xs text-gray-500">({a.priority})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={() => void applyToBoard()} disabled={busy} className="btn-primary w-full">
              <LayoutList className="h-4 w-4" />
              {busy ? "Applying…" : "Apply outcomes to board"}
            </button>
            <button
              onClick={() => void saveSessionOnly()}
              disabled={busy}
              className="btn-ghost w-full text-gray-400"
            >
              Close without applying
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
