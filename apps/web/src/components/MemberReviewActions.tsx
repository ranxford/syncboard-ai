"use client";

import { useEffect, useState } from "react";
import { FileUp, Loader2, Send } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/store/toast";

/** Compact member controls — submit deliverables without AI analyzer gating. */
export function MemberReviewActions({
  projectId,
  onOpenDeliverables,
}: {
  projectId: string;
  onOpenDeliverables: () => void;
}) {
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void api.getSubmissionReadiness(projectId).then(({ existingSubmission }) => {
      setExistingStatus(existingSubmission?.status ?? null);
    });
  }, [projectId]);

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
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.getSubmissionReadiness(projectId);
      await api.submitDeliverable(projectId);
      toast.success("Submitted for review.");
      setExistingStatus("submitted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not submit — attach files and run Analyze first.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-1 border-l border-white/10 pl-2">
      <button
        type="button"
        onClick={onOpenDeliverables}
        className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-gray-100"
        title="Open deliverables panel (also available in Review column)"
      >
        <FileUp className="h-4 w-4" />
      </button>
      {canSubmit && (
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="btn-primary px-2 py-1 text-[11px]"
          title="Submit for admin review"
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
