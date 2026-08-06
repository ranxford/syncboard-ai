import type { ReviewSource } from "@prisma/client";

export type ReviewSourceRow = {
  id: string;
  projectId: string;
  userId: string;
  submissionId: string | null;
  kind: string;
  label: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  externalUrl: string;
  note: string;
  createdAt: string;
  downloadUrl: string | null;
};

export function serializeReviewSource(
  row: ReviewSource,
  opts?: { includeDownload?: boolean },
): ReviewSourceRow {
  const hasFile = !!row.storageKey;
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    submissionId: row.submissionId,
    kind: row.kind,
    label: row.label,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    externalUrl: row.externalUrl,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    downloadUrl:
      opts?.includeDownload && hasFile
        ? `/api/projects/${row.projectId}/review-sources/${row.id}/file`
        : hasFile
          ? `/api/projects/${row.projectId}/review-sources/${row.id}/file`
          : null,
  };
}
