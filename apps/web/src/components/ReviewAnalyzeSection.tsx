"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAutoSubmissionReadiness } from "@/lib/useAutoSubmissionReadiness";
import { toast } from "@/store/toast";

/** Upload → analyze → submit flow for member deliverables in the Review panel. */
export function ReviewAnalyzeSection({ projectId }: { projectId: string }) {
  const { readiness, existingStatus, analyzing, error, lastCheckedAt, refresh } =
    useAutoSubmissionReadiness(projectId, true);
  const [submitting, setSubmitting] = useState(false);

  const accepted = existingStatus === "accepted";
  const submitted = existingStatus === "submitted";

  async function analyze() {
    const result = await refresh();
    if (!result) {
      toast.error(error ?? "Could not analyze deliverables.");
      return;
    }
    if (result.readiness.ready) {
      toast.success(`Analysis passed — ${result.readiness.score}% ready to submit.`);
    } else {
      toast.error(result.readiness.blockers[0]?.message ?? "Fix the issues below before submitting.");
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      await refresh();
      await api.submitDeliverable(projectId);
      toast.success("Submitted for admin review.");
      await refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not submit.";
      toast.error(message);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-6 border-t border-white/10 pt-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-100">
        <Sparkles className="h-4 w-4 text-brand-400" /> Analyze & submit
      </h3>
      <p className="mb-3 text-xs text-gray-500">
        Upload files above, then analyze against your role criteria. Submit when the check passes.
      </p>

      {accepted && (
        <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <CheckCircle2 className="mr-1 inline h-4 w-4" /> Accepted by admin.
        </p>
      )}

      {submitted && !accepted && (
        <p className="mb-3 rounded-lg border border-brand-500/25 bg-brand-500/10 p-3 text-xs text-brand-200">
          Submitted — waiting for admin review.
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200">
          {error}
        </p>
      )}

      {readiness?.codeReview?.analyzed && !accepted && (
        <ul className="mb-3 space-y-1 rounded-lg border border-brand-500/20 bg-brand-500/5 p-3 text-xs text-brand-100/90">
          {readiness.codeReview.findings.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>
      )}

      {readiness && readiness.blockers.length > 0 && !accepted && (
        <ul className="mb-3 space-y-1 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-100/90">
          {readiness.blockers.map((b) => (
            <li key={b.code}>• {b.message}</li>
          ))}
        </ul>
      )}

      {readiness?.ready && !accepted && !submitted && (
        <p className="mb-3 text-xs text-emerald-300">
          Ready to submit — {readiness.score}%
          {lastCheckedAt ? ` (checked ${lastCheckedAt.toLocaleTimeString()})` : ""}
        </p>
      )}

      {!accepted && !submitted && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={analyzing}
            onClick={() => void analyze()}
            className="btn-ghost w-full py-2 text-sm"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {analyzing ? "Analyzing…" : "Analyze deliverables"}
          </button>
          <button
            type="button"
            disabled={!readiness?.ready || submitting || analyzing}
            onClick={() => void submit()}
            className="btn-primary w-full py-2 text-sm disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </div>
      )}
    </section>
  );
}
