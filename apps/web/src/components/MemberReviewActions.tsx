"use client";

import { useState } from "react";
import { FileUp, Loader2, Send } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAutoSubmissionReadiness } from "@/lib/useAutoSubmissionReadiness";
import type { SubmissionReadiness } from "@/lib/types";
import { toast } from "@/store/toast";

function blockerMessage(readiness: SubmissionReadiness | null): string {
  if (!readiness?.blockers.length) {
    return "Complete alignment check first — update tasks, timeline, or attach deliverables.";
  }
  return readiness.blockers.map((b) => b.message).join(" ");
}

/** Compact member controls — lives in the toolbar, not a full-width bar. */
export function MemberReviewActions({
  projectId,
  onOpenDeliverables,
}: {
  projectId: string;
  onOpenDeliverables: () => void;
}) {
  const { readiness, existingStatus, analyzing, refresh } = useAutoSubmissionReadiness(projectId, true);
  const [submitting, setSubmitting] = useState(false);

  const ready = readiness?.ready ?? false;
  const score = readiness?.score ?? 0;
  const codeReview = readiness?.codeReview;
  const scoreTitle = [
    readiness?.member?.aiFeedback,
    codeReview?.isTechTrack && codeReview.analyzed
      ? `Code: ${codeReview.score}% (${codeReview.fileCount} files)`
      : codeReview?.isTechTrack
        ? "Attach code ZIP or repo link"
        : null,
    !ready && readiness?.blockers.length ? blockerMessage(readiness) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const accepted = existingStatus === "accepted";
  const submitted = existingStatus === "submitted";
  const canSubmit = !accepted && !submitted;

  if (accepted) {
    return (
      <span className="hidden items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] text-emerald-300 sm:flex">
        Accepted
      </span>
    );
  }

  async function submit() {
    if (analyzing || submitting) return;
    setSubmitting(true);
    try {
      const data = await refresh();
      const latest = data?.readiness ?? readiness;
      if (!latest?.ready) {
        toast.error(blockerMessage(latest));
        return;
      }
      await api.submitDeliverable(projectId);
      toast.success("Submitted for review.");
      await refresh();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.data.readiness && typeof err.data.readiness === "object") {
        const r = err.data.readiness as SubmissionReadiness;
        toast.error(blockerMessage(r));
      } else {
        toast.error(err instanceof Error ? err.message : "Could not submit.");
      }
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-1 border-l border-white/10 pl-2">
      <span
        className={`hidden rounded-md px-1.5 py-1 text-[11px] font-medium sm:inline ${
          ready ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-gray-400"
        }`}
        title={scoreTitle || "AI alignment score"}
      >
        {analyzing ? "…" : `${score}%`}
      </span>
      <button
        type="button"
        onClick={onOpenDeliverables}
        className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-gray-100"
        title="Attach Figma exports, code ZIP, or repo link"
      >
        <FileUp className="h-4 w-4" />
      </button>
      {canSubmit && (
        <button
          type="button"
          disabled={submitting || analyzing}
          onClick={() => void submit()}
          className={`btn-primary px-2 py-1 text-[11px] ${!ready ? "opacity-60" : ""}`}
          title={ready ? "Submit for admin review" : blockerMessage(readiness)}
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          <span className="hidden md:inline">Submit</span>
        </button>
      )}
      {submitted && (
        <span className="text-[11px] text-gray-500" title="Waiting for admin review">
          Pending
        </span>
      )}
    </div>
  );
}
