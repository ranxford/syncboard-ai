"use client";

import { useState } from "react";
import { CheckCircle2, Send, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAutoSubmissionReadiness } from "@/lib/useAutoSubmissionReadiness";
import { toast } from "@/store/toast";

/** Detail view inside Alignment panel — uses the same auto-analyzer as the board bar. */
export function SubmitDeliverableSection({ projectId }: { projectId: string }) {
  const { readiness, existingStatus, analyzing, refresh } = useAutoSubmissionReadiness(
    projectId,
    true,
  );
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      await refresh();
      await api.submitDeliverable(projectId);
      toast.success("Submitted for admin review.");
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Requirements not met yet.");
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-6 border-t border-white/10 pt-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-100">
        <Sparkles className="h-4 w-4 text-brand-400" /> Submit for review
      </h3>
      <p className="mb-3 text-xs text-gray-500">
        The analyzer on the board runs automatically. Use this if you prefer the full panel view.
      </p>

      {existingStatus === "accepted" && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <CheckCircle2 className="mr-1 inline h-4 w-4" /> Accepted by admin.
        </p>
      )}

      {readiness?.member?.aiSuggestions && readiness.member.aiSuggestions.length > 0 && (
        <ul className="mb-3 list-disc space-y-1 pl-4 text-xs text-brand-200/90">
          {readiness.member.aiSuggestions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}

      {readiness?.codeReview?.isTechTrack && readiness.codeReview.analyzed && existingStatus !== "accepted" && (
        <ul className="mb-3 space-y-1 rounded-lg border border-brand-500/20 bg-brand-500/5 p-3 text-xs text-brand-100/90">
          {readiness.codeReview.findings.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>
      )}

      {readiness && readiness.blockers.length > 0 && existingStatus !== "accepted" && (
        <ul className="mb-3 space-y-1 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200/90">
          {readiness.blockers.map((b) => (
            <li key={b.code}>• {b.message}</li>
          ))}
        </ul>
      )}

      {readiness?.ready && existingStatus !== "accepted" && (
        <p className="mb-3 text-xs text-emerald-300">
          AI check passed — {readiness.score}% {analyzing ? "(re-checking…)" : ""}
        </p>
      )}

      {existingStatus !== "accepted" && (
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!readiness?.ready || submitting || analyzing}
          className="btn-primary w-full py-2 text-sm disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      )}
    </section>
  );
}
