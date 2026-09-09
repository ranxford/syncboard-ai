"use client";

import { ShieldCheck } from "lucide-react";
import type { ProjectReviewAnalysis } from "@/lib/types";
import { ReviewCriteriaPanel } from "./ReviewCriteriaPanel";
import { ReviewColumnSubmissionHub } from "./ReviewColumnSubmissionHub";

export function ReviewColumnHeader({
  projectId,
  requirements,
  reviewAnalysisRaw,
  isAdmin,
  showSubmissionHub = true,
}: {
  projectId: string;
  requirements: string;
  reviewAnalysisRaw?: string;
  isAdmin: boolean;
  showSubmissionHub?: boolean;
}) {
  let analysis: ProjectReviewAnalysis | null = null;
  if (reviewAnalysisRaw) {
    try {
      analysis = JSON.parse(reviewAnalysisRaw) as ProjectReviewAnalysis;
    } catch {
      analysis = null;
    }
  }

  return (
    <div className="mb-2 space-y-2 rounded-lg border border-brand-500/25 bg-gradient-to-b from-brand-500/[0.08] to-transparent p-2.5">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-brand-200">Final review</p>
          <p className="text-[10px] leading-relaxed text-gray-400">
            Upload your completed project files here. DeepSeek reviews them automatically before Done.
          </p>
        </div>
      </div>
      {analysis && (
        <div className="rounded-md border border-white/[0.06] bg-black/20 p-2 text-[10px] text-gray-300">
          <p className="font-medium text-brand-200/90">Project analyzer</p>
          <p className="mt-1 leading-relaxed">{analysis.summary}</p>
          {analysis.blockers.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-amber-300/90">
              {analysis.blockers.slice(0, 3).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {isAdmin && <ReviewCriteriaPanel projectId={projectId} requirements={requirements} />}
      {showSubmissionHub && <ReviewColumnSubmissionHub projectId={projectId} />}
    </div>
  );
}
