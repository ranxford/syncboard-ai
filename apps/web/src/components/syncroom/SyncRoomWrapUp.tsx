"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Clock, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import type { MeetingResult } from "@/lib/types";
import { relativeTime } from "@/lib/ui";
import type { SessionEvent, TaskContext } from "@/lib/syncRoom/sessionLog";
import { useSyncRoom } from "@/store/call";
import { toast } from "@/store/toast";

export function SyncRoomWrapUp({
  open,
  sessionLog,
  contextTask,
  onClose,
}: {
  open: boolean;
  sessionLog: SessionEvent[];
  contextTask: TaskContext | null;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MeetingResult | null>(null);

  if (!open) return null;

  async function generateSummary() {
    const transcript = [
      contextTask ? `Task discussion: ${contextTask.title}` : "Project SyncRoom session",
      "",
      "Session timeline:",
      ...sessionLog.map((e) => `- ${e.label}`),
      "",
      notes.trim() ? `Facilitator notes:\n${notes.trim()}` : "",
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

  async function attachToTask() {
    if (!contextTask || !result) return;
    const body = [
      "## SyncRoom summary",
      result.summary,
      "",
      result.decisions.length ? `**Decisions:**\n${result.decisions.map((d) => `- ${d}`).join("\n")}` : "",
      result.actionItems.length
        ? `**Action items:**\n${result.actionItems.map((a) => `- ${a.title}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    setBusy(true);
    try {
      await api.addComment(contextTask.id, body);
      toast.success("Summary attached to the task.");
      onClose();
    } catch {
      toast.error("Couldn't attach the summary.");
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
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <section className="mb-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Clock className="h-3.5 w-3.5" /> Timeline
          </h3>
          <ul className="space-y-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            {sessionLog.map((e) => (
              <li key={e.id} className="flex gap-2 text-xs text-gray-300">
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
                <p className="mb-1 text-xs font-semibold text-gray-400">Suggested action items</p>
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
            <div className="flex gap-2">
              {contextTask && (
                <button onClick={() => void attachToTask()} disabled={busy} className="btn-primary flex-1">
                  Attach to task
                </button>
              )}
              <button onClick={onClose} className="btn-ghost flex-1">
                Done
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
