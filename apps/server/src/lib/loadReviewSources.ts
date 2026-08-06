import { prisma } from "../prisma.js";
import type { ReviewSourceInput } from "./codeExtract.js";

export async function loadMemberReviewSources(
  projectId: string,
  userId: string,
): Promise<ReviewSourceInput[]> {
  const rows = await prisma.reviewSource.findMany({
    where: { projectId, userId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    kind: r.kind,
    label: r.label,
    fileName: r.fileName,
    mimeType: r.mimeType,
    storageKey: r.storageKey,
    externalUrl: r.externalUrl,
    note: r.note,
  }));
}
