"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send, Sparkles, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAutoSubmissionReadiness } from "@/lib/useAutoSubmissionReadiness";
import { useBoard } from "@/store/board";
import { toast } from "@/store/toast";

/** Upload → analyze → automated DeepSeek review on tasks in the Review column. */
export function ReviewAnalyzeSection({ projectId }: { projectId: string }) {
  const { readiness, analyzing, error, lastCheckedAt, refresh } =
    useAutoSubmissionReadiness(projectId, true);
  const applyServerBoard = useBoard((s) => s.applyServerBoard);
  const [submitting, setSubmitting] = useState(false);
  const [lastResults, setLastResults] = useState<
    { taskId: string; title: string; passed: boolean; feedback: string }[] | null
  >(null);

  async function analyze() {
    const result = await refresh();
    if (!result) {
      toast.error(error ?? "Could not analyze deliverables.");
      return;
    }
    if (result.readiness.ready) {
      toast.success(`Pre-check passed — ${result.readiness.score}% aligned with criteria.`);
    } else {
      toast.error(result.readiness.blockers[0]?.message ?? "Fix the issues below before submitting.");
    }
  }

  async function submit() {
    setSubmitting(true);
    setLastResults(null);
    try {
      await refresh();
      const { board, results } = await api.submitReviewPackage(projectId);
      applyServerBoard(board);
      setLastResults(results);
      const passed = results.filter((r) => r.passed).length;
      const failed = results.length - passed;
      if (failed === 0) {
        toast.success(`DeepSeek review passed for ${passed} task${passed === 1 ? "" : "s"}.`);
      } else if (passed === 0) {
        toast.error(`Review failed — see feedback below and re-submit after fixes.`);
      } else {
        toast.error(`${passed} passed, ${failed} failed — check feedback below.`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not submit for review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="border-t border-white/10 pt-3">
      <h3 className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-gray-200">
        <Sparkles className="h-3.5 w-3.5 text-brand-400" /> Analyze & submit
      </h3>
      <p className="mb-3 text-[10px] text-gray-500">
        Pre-check your files, then submit. DeepSeek reviews everything automatically — no manual
        admin step required to move to Done.
      </p>

      {error && (
        <p className="mb-3 rounded-lg border border-red-500/25 bg-red-500/10 p-2.5 text-[10px] text-red-200">
          {error}
        </p>
      )}

      {readiness?.codeReview?.analyzed && (
        <ul className="mb-3 space-y-1 rounded-lg border border-brand-500/20 bg-brand-500/5 p-2.5 text-[10px] text-brand-100/90">
          {readiness.codeReview.findings.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>
      )}

      {readiness && readiness.blockers.length > 0 && (
        <ul className="mb-3 space-y-1 rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5 text-[10px] text-amber-100/90">
          {readiness.blockers.map((b) => (
            <li key={b.code}>• {b.message}</li>
          ))}
        </ul>
      )}

      {readiness?.ready && (
        <p className="mb-3 text-[10px] text-emerald-300">
          Ready to submit — {readiness.score}%
          {lastCheckedAt ? ` (checked ${lastCheckedAt.toLocaleTimeString()})` : ""}
        </p>
      )}

      {lastResults && lastResults.length > 0 && (
        <ul className="mb-3 space-y-2">
          {lastResults.map((r) => (
            <li
              key={r.taskId}
              className={`rounded-lg border p-2.5 text-[10px] ${
                r.passed
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                  : "border-red-500/25 bg-red-500/10 text-red-100"
              }`}
            >
              <p className="flex items-center gap-1 font-medium">
                {r.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                {r.title} — {r.passed ? "passed" : "failed"}
              </p>
              <p className="mt-1 leading-relaxed opacity-90">{r.feedback}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={analyzing || submitting}
          onClick={() => void analyze()}
          className="btn-ghost w-full py-1.5 text-[11px]"
        >
          {analyzing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {analyzing ? "Analyzing…" : "Pre-check deliverables"}
        </button>
        <button
          type="button"
          disabled={submitting || analyzing}
          onClick={() => void submit()}
          className="btn-primary w-full py-1.5 text-[11px] disabled:opacity-40"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {submitting ? "DeepSeek is reviewing…" : "Submit for DeepSeek review"}
        </button>
      </div>
    </section>
  );
}
