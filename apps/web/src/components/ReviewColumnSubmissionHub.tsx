"use client";

import { ReviewSourcesPanel } from "./ReviewSourcesPanel";
import { ReviewAnalyzeSection } from "./ReviewAnalyzeSection";

/** Inline submission hub — upload completed project work directly in the Review column. */
export function ReviewColumnSubmissionHub({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-3 rounded-lg border border-white/[0.08] bg-black/25 p-2.5">
      <div>
        <p className="text-[11px] font-semibold text-gray-200">Submit completed work</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">
          Upload docs, code, images, or ZIP folders. DeepSeek reviews everything against your role
          criteria when you submit.
        </p>
      </div>
      <ReviewSourcesPanel projectId={projectId} compact />
      <ReviewAnalyzeSection projectId={projectId} />
    </div>
  );
}
