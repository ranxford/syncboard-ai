"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Figma, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { DeliverableSubmissionRow, ReviewSource } from "@/lib/types";
import { Avatar } from "./Avatar";
import { toast } from "@/store/toast";

function SourceRow({ projectId, source }: { projectId: string; source: ReviewSource }) {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    if (!source.mimeType.startsWith("image/")) return;
    let url: string | null = null;
    void api.fetchReviewSourceBlob(projectId, source.id).then((blob) => {
      url = URL.createObjectURL(blob);
      setThumb(url);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [projectId, source.id, source.mimeType]);

  return (
    <li className="rounded-lg border border-white/[0.06] bg-ink-950/50 px-2 py-1.5 text-[11px]">
      <div className="flex items-center gap-1.5 text-gray-200">
        {(source.kind === "figma_link" || source.kind === "figma_export") && (
          <Figma className="h-3 w-3 text-brand-300" />
        )}
        <span className="font-medium">{source.label}</span>
        <span className="text-gray-600">· {source.kind.replace(/_/g, " ")}</span>
      </div>
      {source.externalUrl && (
        <a
          href={source.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 flex items-center gap-1 truncate text-brand-300 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          {source.externalUrl}
        </a>
      )}
      {source.fileName && <p className="text-gray-500">{source.fileName}</p>}
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="mt-1 max-h-24 rounded border border-white/10 object-contain" />
      )}
    </li>
  );
}

export function AdminSubmissionsList({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<DeliverableSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [briefLoading, setBriefLoading] = useState<string | null>(null);
  const [expandedBrief, setExpandedBrief] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { submissions } = await api.listSubmissions(projectId);
      setRows(submissions);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [projectId]);

  async function review(userId: string, status: "accepted" | "revision_requested") {
    try {
      await api.reviewSubmission(projectId, userId, { status });
      toast.success(status === "accepted" ? "Marked accepted." : "Revision requested.");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Review failed.");
    }
  }

  async function generateBrief(userId: string) {
    setBriefLoading(userId);
    try {
      const { brief } = await api.generateReviewBrief(projectId, userId);
      setExpandedBrief(userId);
      setRows((prev) =>
        prev.map((r) => (r.userId === userId ? { ...r, reviewBrief: brief, reviewBriefAt: new Date().toISOString() } : r)),
      );
      toast.success("Review brief generated.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not generate brief.");
    } finally {
      setBriefLoading(null);
    }
  }

  if (loading) return <p className="mt-4 text-xs text-gray-500">Loading submissions…</p>;
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-xs text-gray-500">
        No member submissions yet. They attach Figma/files and submit after the AI check passes.
      </p>
    );
  }

  return (
    <section className="mt-6 border-t border-white/10 pt-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-100">Member submissions</h3>
      <p className="mb-3 text-[11px] text-gray-500">
        Review uploaded deliverables and generate an AI brief (NotebookLM-style) over sources +
        alignment.
      </p>
      <ul className="space-y-3">
        {rows.map((s) => (
          <li key={s.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Avatar name={s.userName} color={s.avatarColor} size={28} />
                <div>
                  <p className="text-sm font-medium text-gray-100">{s.userName}</p>
                  <p className="text-[10px] capitalize text-gray-500">
                    {s.status.replace("_", " ")} · {s.alignmentScore}% at submit
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-gray-500">
                {new Date(s.submittedAt).toLocaleDateString()}
              </span>
            </div>

            {s.memberSummary && (
              <p className="mb-2 text-xs text-gray-400">
                <span className="text-gray-500">Alignment summary: </span>
                {s.memberSummary}
              </p>
            )}

            {s.sources.length > 0 && (
              <div className="mb-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Deliverables ({s.sources.length})
                </p>
                <ul className="space-y-1">
                  {s.sources.map((src) => (
                    <SourceRow key={src.id} projectId={projectId} source={src} />
                  ))}
                </ul>
              </div>
            )}

            {s.sources.length === 0 && (
              <p className="mb-2 text-[11px] text-amber-200/80">No files attached to this submission.</p>
            )}

            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={briefLoading === s.userId}
                onClick={() => void generateBrief(s.userId)}
                className="btn-ghost flex items-center gap-1 py-1 text-[10px]"
              >
                {briefLoading === s.userId ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Generate review brief
              </button>
            </div>

            {s.reviewBrief && expandedBrief === s.userId && (
              <pre className="mb-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-brand-500/20 bg-brand-500/5 p-2.5 text-[11px] leading-relaxed text-gray-300">
                {s.reviewBrief}
              </pre>
            )}
            {s.reviewBrief && expandedBrief !== s.userId && (
              <button
                type="button"
                onClick={() => setExpandedBrief(s.userId)}
                className="mb-2 text-[10px] text-brand-300 hover:underline"
              >
                Show saved review brief
              </button>
            )}

            {s.status === "submitted" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void review(s.userId, "accepted")}
                  className="btn-primary py-1 text-[10px]"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => void review(s.userId, "revision_requested")}
                  className="btn-ghost py-1 text-[10px]"
                >
                  Request revision
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
