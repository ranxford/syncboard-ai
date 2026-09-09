"use client";

import { useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { useBoard } from "@/store/board";
import { toast } from "@/store/toast";
import { canCreateTaskInColumn } from "@/lib/columns";
import { DeepSeekBadge } from "./DeepSeekBadge";
import type { AiProviderInfo } from "@/lib/types";

export function AskDeepSeekPanel({
  projectId,
  open,
  onClose,
  aiInfo,
  isAdmin,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  aiInfo: AiProviderInfo | null;
  isAdmin: boolean;
}) {
  const board = useBoard((s) => s.board);
  const applyServerBoard = useBoard((s) => s.applyServerBoard);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open || !board || !isAdmin) return null;

  const targetColumn =
    board.columns.find((c) => canCreateTaskInColumn(c.name)) ?? board.columns[0];

  async function generate() {
    if (!instruction.trim() || !targetColumn) return;
    setBusy(true);
    try {
      const res = await api.generateTasks(projectId, {
        instruction: instruction.trim(),
        columnId: targetColumn.id,
      });
      applyServerBoard(res.board);
      toast.success(`Created ${res.created} task(s) for team members.`);
      setInstruction("");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Task generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-xl border border-brand-500/20 bg-ink-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-300" />
            <h2 className="text-sm font-semibold text-gray-100">Ask AI</h2>
            <DeepSeekBadge info={aiInfo} compact />
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:text-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-xs text-gray-400">
            Describe what the team should work on. AI creates one task per member in{" "}
            <strong className="text-gray-300">{targetColumn?.name ?? "To Do"}</strong>, using each
            member&apos;s assigned requirements.
          </p>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={4}
            placeholder="e.g. Prepare launch deliverables — each member should complete their role-specific checklist before Friday."
            className="input w-full resize-none text-sm"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || instruction.trim().length < 3}
              onClick={() => void generate()}
              className="btn-primary text-sm"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate tasks"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
