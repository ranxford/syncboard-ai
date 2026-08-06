"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Lightbulb, ThumbsUp, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Idea } from "@/lib/types";
import { ideaHintForField } from "@/lib/projectFields";
import { useBoard } from "@/store/board";
import { toast } from "@/store/toast";

export function IdeasPanel({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const applyServerBoard = useBoard((s) => s.applyServerBoard);
  const projectField = useBoard((s) => s.board?.project.field);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { ideas } = await api.getIdeas(projectId);
    setIdeas(ideas);
  }

  useEffect(() => {
    if (open) void load().catch(() => toast.error("Couldn't load ideas."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api.createIdea(projectId, { title: title.trim(), body: body.trim() });
      setTitle("");
      setBody("");
      toast.success("Idea submitted.");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit idea");
    } finally {
      setBusy(false);
    }
  }

  async function vote(id: string) {
    try {
      const { idea } = await api.voteIdea(id);
      setIdeas((list) => list.map((i) => (i.id === idea.id ? idea : i)));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Vote failed");
    }
  }

  async function promote(id: string) {
    try {
      const { idea, board } = await api.promoteIdea(id);
      applyServerBoard(board);
      setIdeas((list) => list.map((i) => (i.id === idea.id ? idea : i)));
      toast.success("Promoted to the board.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't promote");
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-gray-50">
              <Lightbulb className="h-4 w-4 text-amber-300" /> Ideas & suggestions
            </h2>
            <p className="text-xs text-gray-500">{ideaHintForField(projectField)}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-2 border-b border-white/10 p-4">
          <input
            className="input"
            placeholder={ideaHintForField(projectField)}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input min-h-[64px] resize-y"
            placeholder="Optional detail…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Submitting…" : "Submit idea"}
          </button>
        </form>

        <ul className="flex-1 space-y-3 overflow-y-auto p-4">
          {ideas.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">No ideas yet — be the first.</p>
          )}
          {ideas.map((idea) => (
            <li
              key={idea.id}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="font-medium text-gray-100">{idea.title}</p>
                {idea.status === "promoted" && (
                  <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
                    Promoted
                  </span>
                )}
              </div>
              {idea.body && <p className="mb-2 text-xs text-gray-400">{idea.body}</p>}
              <p className="mb-2 text-[11px] text-gray-500">by {idea.author.name}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void vote(idea.id)}
                  disabled={idea.status !== "open"}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                    idea.votedByMe
                      ? "bg-brand-500/20 text-brand-200"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  <ThumbsUp className="h-3.5 w-3.5" /> {idea.voteCount}
                </button>
                {idea.status === "open" && (
                  <button
                    type="button"
                    onClick={() => void promote(idea.id)}
                    className="btn-ghost flex items-center gap-1 px-2 py-1 text-xs"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" /> Promote to task
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
