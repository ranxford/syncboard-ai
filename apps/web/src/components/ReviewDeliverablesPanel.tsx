"use client";

import { X, Inbox, FileUp } from "lucide-react";
import { useEscape } from "@/lib/useEscape";
import { ReviewSourcesPanel } from "./ReviewSourcesPanel";
import { AdminSubmissionsList } from "./AdminSubmissionsList";

export function ReviewDeliverablesPanel({
  open,
  onClose,
  projectId,
  isAdmin,
  isMember,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  isAdmin: boolean;
  isMember: boolean;
}) {
  useEscape(onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-ink-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-100">
            {isAdmin ? <Inbox className="h-4 w-4 text-brand-400" /> : <FileUp className="h-4 w-4 text-brand-400" />}
            {isAdmin ? "Submissions" : "My deliverables"}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {isMember && <ReviewSourcesPanel projectId={projectId} />}
          {isAdmin && <AdminSubmissionsList projectId={projectId} />}
        </div>
      </aside>
    </div>
  );
}
