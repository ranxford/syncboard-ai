"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ListChecks, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { useBoard } from "@/store/board";
import { useEscape } from "@/lib/useEscape";
import type { Column, Member, MeetingResult, Priority } from "@/lib/types";
import { PRIORITY_STYLES } from "@/lib/ui";

const SAMPLE = `Standup notes:
- Ada will finish the WebSocket presence feature by Friday.
- We decided to go with SQLite for local dev and Postgres in production.
- Grace needs to review the security audit, it's urgent.
- Someone should investigate the offline sync edge cases.
- Linus to prepare the demo deck for next week.`;

function matchMember(hint: string | undefined, members: Member[]): string | null {
  if (!hint) return null;
  const h = hint.trim().toLowerCase();
  const found = members.find(
    (m) => m.name.toLowerCase() === h || m.name.toLowerCase().split(" ")[0] === h,
  );
  return found?.id ?? null;
}

export function MeetingModal({
  projectId,
  columns,
  members,
  onClose,
}: {
  projectId: string;
  columns: Column[];
  members: Member[];
  onClose: () => void;
}) {
  const applyServerBoard = useBoard((s) => s.applyServerBoard);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [columnId, setColumnId] = useState(columns[0]?.id ?? "");
  const [imported, setImported] = useState<number | null>(null);

  useEscape(onClose);

  async function summarize() {
    if (!transcript.trim()) return;
    setBusy(true);
    setImported(null);
    try {
      const { result } = await api.summarizeMeeting(transcript);
      setResult(result);
      setSelected(Object.fromEntries(result.actionItems.map((_, i) => [i, true])));
    } finally {
      setBusy(false);
    }
  }

  async function importTasks() {
    if (!result) return;
    const items = result.actionItems
      .filter((_, i) => selected[i])
      .map((a) => ({
        title: a.title,
        priority: a.priority as Priority,
        assigneeId: matchMember(a.assigneeHint, members),
      }));
    if (items.length === 0) return;
    setBusy(true);
    try {
      const { board } = await api.importTasks(projectId, columnId, items);
      applyServerBoard(board);
      setImported(items.length);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="card card-shadow flex max-h-[90vh] w-full max-w-2xl flex-col"
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400 ring-1 ring-inset ring-brand-500/20">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="font-semibold text-gray-50">AI Meeting Intelligence</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-400">Paste meeting transcript or notes</label>
              <button onClick={() => setTranscript(SAMPLE)} className="text-xs text-brand-400 hover:underline">
                Use sample
              </button>
            </div>
            <textarea
              className="input min-h-[140px] resize-y"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste your meeting notes here…"
            />
          </div>

          <button onClick={summarize} disabled={busy || !transcript.trim()} className="btn-primary w-full">
            {busy && !result ? "Analyzing…" : "Summarize & extract action items"}
          </button>

          {result && (
            <div className="space-y-4">
              <section className="glass rounded-xl p-4">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Summary</h3>
                <p className="text-sm text-gray-200">{result.summary}</p>
              </section>

              {result.decisions.length > 0 && (
                <section className="glass rounded-xl p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Decisions</h3>
                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-300">
                    {result.decisions.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <ListChecks className="h-3.5 w-3.5" /> Action items
                  </h3>
                  <span className="text-xs text-gray-500">{result.actionItems.length} found</span>
                </div>

                {result.actionItems.length === 0 ? (
                  <p className="text-sm text-gray-500">No action items detected.</p>
                ) : (
                  <div className="space-y-2">
                    {result.actionItems.map((a, i) => {
                      const prio = PRIORITY_STYLES[a.priority as Priority];
                      const matchedId = matchMember(a.assigneeHint, members);
                      const matched = members.find((m) => m.id === matchedId);
                      return (
                        <label key={i} className="glass flex cursor-pointer items-start gap-3 rounded-xl p-3">
                          <input
                            type="checkbox"
                            checked={!!selected[i]}
                            onChange={(e) => setSelected({ ...selected, [i]: e.target.checked })}
                            className="mt-1 h-4 w-4 accent-brand-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm text-gray-200">{a.title}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={`rounded px-1.5 py-0.5 text-[10px] ${prio.className}`}>
                                {prio.label}
                              </span>
                              {matched ? (
                                <span className="text-[11px] text-emerald-300">→ {matched.name}</span>
                              ) : (
                                a.assigneeHint && (
                                  <span className="text-[11px] text-gray-500">~ {a.assigneeHint}</span>
                                )
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </section>

              {result.actionItems.length > 0 && (
                <div className="flex items-center gap-2 border-t border-white/10 pt-4">
                  <select
                    className="input flex-1"
                    value={columnId}
                    onChange={(e) => setColumnId(e.target.value)}
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id} className="bg-ink-800">
                        Add to: {c.name}
                      </option>
                    ))}
                  </select>
                  <button onClick={importTasks} disabled={busy} className="btn-primary whitespace-nowrap">
                    Create tasks
                  </button>
                </div>
              )}

              {imported != null && (
                <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  Imported {imported} task(s) to the board.
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
