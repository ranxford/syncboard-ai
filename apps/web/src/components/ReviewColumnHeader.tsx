"use client";

import { ShieldCheck, Sparkles } from "lucide-react";
import type { ProjectReviewAnalysis } from "@/lib/types";
import { ReviewCriteriaPanel } from "./ReviewCriteriaPanel";

export function ReviewColumnHeader({
  projectId,
  requirements,
  reviewAnalysisRaw,
  isAdmin,
}: {
  projectId: string;
  requirements: string;
  reviewAnalysisRaw?: string;
  isAdmin: boolean;
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
    <div className="mb-2 space-y-2 rounded-lg border border-violet-500/25 bg-gradient-to-b from-violet-500/[0.08] to-transparent p-2.5">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-violet-200">DeepSeek Review Gate</p>
          <p className="text-[10px] leading-relaxed text-gray-400">
            Submit work here before Done. DeepSeek checks deliverables against admin criteria.
          </p>
        </div>
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-400/70" />
      </div>
      {analysis && (
        <div className="rounded-md border border-white/[0.06] bg-black/20 p-2 text-[10px] text-gray-300">
          <p className="font-medium text-violet-200/90">Project analyzer</p>
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
    </div>
  );
}
