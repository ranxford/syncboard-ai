"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Info,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useBoard } from "@/store/board";
import { useEscape } from "@/lib/useEscape";
import type { AnalyticsResult, Insight } from "@/lib/types";

const SEVERITY: Record<Insight["severity"], { icon: typeof Info; color: string }> = {
  info: { icon: Info, color: "text-sky-400" },
  warning: { icon: AlertTriangle, color: "text-amber-400" },
  critical: { icon: AlertTriangle, color: "text-red-400" },
};

export function AIPanel({
  projectId,
  open,
  onClose,
  onOpenMeeting,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onOpenMeeting: () => void;
}) {
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const updateTask = useBoard((s) => s.updateTask);

  useEscape(() => {
    if (open) onClose();
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { analytics } = await api.getAnalytics(projectId);
      setData(analytics);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function applyRebalance(taskId: string, toUserId: string) {
    await updateTask(taskId, { assigneeId: toUserId });
    await load();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-900"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400 ring-1 ring-inset ring-brand-500/20">
                  <Brain className="h-4 w-4" />
                </span>
                <h2 className="font-semibold text-gray-50">AI Insights</h2>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={load} className="rounded-md p-1.5 text-gray-400 hover:bg-white/10" title="Refresh">
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <button onClick={onOpenMeeting} className="btn-primary w-full">
                <Sparkles className="h-4 w-4" /> Summarize a meeting
              </button>

              {data && (
                <>
                  {/* Metrics */}
                  <section className="grid grid-cols-2 gap-3">
                    <Metric label="Completion" value={`${Math.round(data.metrics.completionRate * 100)}%`} />
                    <Metric label="In progress" value={data.metrics.inProgressTasks} />
                    <Metric label="Overdue" value={data.metrics.overdueTasks} danger={data.metrics.overdueTasks > 0} />
                    <Metric
                      label="Avg cycle"
                      value={data.metrics.avgCycleTimeHours != null ? `${data.metrics.avgCycleTimeHours}h` : "—"}
                    />
                  </section>

                  {/* Workload */}
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Team workload
                    </h3>
                    <div className="space-y-2.5">
                      {data.workload.map((w) => (
                        <div key={w.userId}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-gray-300">{w.name}</span>
                            <span className="text-gray-500">
                              {w.openTasks} tasks · {w.estimateHours}h
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(4, w.loadScore * 100)}%`,
                                backgroundColor:
                                  w.loadScore >= 0.9 ? "#f87171" : w.loadScore >= 0.7 ? "#fbbf24" : "#818cf8",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Rebalance suggestions */}
                  {data.rebalance.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Rebalancing suggestions
                      </h3>
                      <div className="space-y-2">
                        {data.rebalance.map((r) => (
                          <div key={r.taskId} className="glass rounded-xl p-3">
                            <p className="text-sm text-gray-200">{r.taskTitle}</p>
                            <div className="my-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                              {r.fromName} <ArrowRight className="h-3 w-3" /> {r.toName}
                            </div>
                            <p className="mb-2 text-[11px] text-gray-500">{r.reason}</p>
                            <button
                              onClick={() => applyRebalance(r.taskId, r.toUserId)}
                              className="btn-ghost w-full py-1 text-xs"
                            >
                              Reassign to {r.toName}
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Insights */}
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Predictions & risks
                    </h3>
                    {data.insights.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" /> No risks detected. Healthy board!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data.insights.map((ins) => {
                          const S = SEVERITY[ins.severity];
                          return (
                            <div key={ins.id} className="glass rounded-xl p-3">
                              <div className="flex items-start gap-2">
                                <S.icon className={`mt-0.5 h-4 w-4 shrink-0 ${S.color}`} />
                                <div>
                                  <p className="text-sm font-medium text-gray-100">{ins.title}</p>
                                  <p className="text-xs text-gray-400">{ins.detail}</p>
                                  {ins.recommendation && (
                                    <p className="mt-1 text-[11px] text-brand-300">→ {ins.recommendation}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <p className="text-center text-[11px] text-gray-600">
                    Generated {new Date(data.generatedAt).toLocaleTimeString()}
                  </p>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Metric({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        danger ? "border-red-500/20 bg-red-500/5" : "border-white/[0.08] bg-white/[0.03]"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold tabular-nums ${danger ? "text-red-300" : "text-gray-50"}`}>
        {value}
      </p>
    </div>
  );
}
