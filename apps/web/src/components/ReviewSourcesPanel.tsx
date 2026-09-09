"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, FileUp, FolderUp, Link2, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ReviewSource } from "@/lib/types";
import { toast } from "@/store/toast";

function notifySourcesUpdated(projectId: string) {
  window.dispatchEvent(
    new CustomEvent("syncboard:review-sources-updated", { detail: { projectId } }),
  );
}

function kindLabel(kind: ReviewSource["kind"]) {
  if (kind === "figma_link") return "Figma";
  if (kind === "figma_export") return "Export";
  if (kind === "repo_link") return "Repo";
  if (kind === "code_zip") return "Code ZIP";
  if (kind === "code_file") return "Code";
  return kind === "link" ? "Link" : "File";
}

export function ReviewSourcesPanel({
  projectId,
  readOnly = false,
  compact = false,
}: {
  projectId: string;
  readOnly?: boolean;
  compact?: boolean;
}) {
  const [sources, setSources] = useState<ReviewSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { sources: rows } = await api.listReviewSources(projectId);
      setSources(rows);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    let uploaded = 0;
    try {
      for (const file of list) {
        setUploadProgress(`Uploading ${uploaded + 1}/${list.length}: ${file.name}`);
        await api.uploadReviewFile(projectId, file, { label: file.name });
        uploaded += 1;
      }
      toast.success(
        uploaded === 1 ? "File attached." : `${uploaded} files attached.`,
      );
      setLinkLabel("");
      await load();
      notifySourcesUpdated(projectId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  async function onAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim() || !linkLabel.trim()) return;
    try {
      await api.addReviewLink(projectId, { url: linkUrl.trim(), label: linkLabel.trim() });
      toast.success("Link added.");
      setLinkUrl("");
      setLinkLabel("");
      await load();
      notifySourcesUpdated(projectId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not add link.");
    }
  }

  const accept =
    ".png,.jpg,.jpeg,.webp,.pdf,.docx,.zip,.ts,.tsx,.js,.jsx,.py,.md,.json,.txt,.csv,image/*,application/pdf,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*";

  return (
    <div className={`space-y-2 ${compact ? "" : "space-y-3"}`}>
      {!compact && (
        <p className="text-[11px] text-gray-500">
          Attach deliverables: code, docs (PDF, DOCX), images, ZIP archives, or entire folders.
        </p>
      )}

      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : sources.length > 0 ? (
        <ul className="max-h-32 space-y-1 overflow-y-auto">
          {sources.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] px-2 py-1.5 text-xs"
            >
              <div className="min-w-0">
                <span className="font-medium text-gray-200">{s.label}</span>
                <span className="ml-1.5 text-[10px] text-gray-500">{kindLabel(s.kind)}</span>
                {s.externalUrl && (
                  <a
                    href={s.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 flex items-center gap-1 truncate text-brand-300 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                )}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() =>
                    void api.deleteReviewSource(projectId, s.id).then(() => {
                      load();
                      notifySourcesUpdated(projectId);
                    })
                  }
                  className="shrink-0 rounded p-1 text-gray-500 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] text-gray-500">Nothing attached yet — upload files or a folder ZIP below.</p>
      )}

      {!readOnly && (
        <>
          <form onSubmit={(e) => void onAddLink(e)} className="space-y-1.5">
            <input
              className="input py-1.5 text-xs"
              placeholder="Label (e.g. Final report)"
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
            />
            <div className="flex gap-1">
              <input
                className="input min-w-0 flex-1 py-1.5 text-xs"
                placeholder="GitHub, GitLab, Figma, or doc URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <button type="submit" className="btn-ghost px-2" title="Add link">
                <Link2 className="h-4 w-4" />
              </button>
            </div>
          </form>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) void uploadFiles(files);
              e.target.value = "";
            }}
          />
          <input
            ref={folderRef}
            type="file"
            // @ts-expect-error webkitdirectory is supported in Chromium browsers
            webkitdirectory=""
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) void uploadFiles(files);
              e.target.value = "";
            }}
          />
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="btn-ghost flex items-center justify-center gap-1 py-1.5 text-[10px]"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
              Files
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => folderRef.current?.click()}
              className="btn-ghost flex items-center justify-center gap-1 py-1.5 text-[10px]"
              title="Upload all files from a folder"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderUp className="h-3.5 w-3.5" />}
              Folder
            </button>
          </div>
          {uploadProgress && (
            <p className="text-[10px] text-brand-300">{uploadProgress}</p>
          )}
        </>
      )}
    </div>
  );
}
