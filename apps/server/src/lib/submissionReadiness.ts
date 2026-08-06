import type { AlignmentBuildResult } from "./alignmentReport.js";
import { rescoreMemberWithCorpus } from "../ai/alignment.js";
import { buildCodeCorpus, type ReviewSourceInput } from "./codeExtract.js";

export function workCorpusForUser(
  built: AlignmentBuildResult,
  userId: string,
): string {
  const tasks = built.tasksByAssignee.get(userId) ?? [];
  const milestones = built.milestonesByOwner.get(userId) ?? [];
  return [
    ...tasks.filter((t) => !t.completedAt).map((t) => `${t.title} ${t.description}`),
    ...milestones.map((m) => `${m.title} ${m.description}`),
  ]
    .join(" ")
    .toLowerCase();
}

export function sourceMetaCorpus(sources: ReviewSourceInput[]): string {
  return sources
    .map((s) => `${s.label} ${s.note} ${s.fileName} ${s.externalUrl}`)
    .join(" ")
    .toLowerCase();
}

export async function readinessMemberWithDeliverables(
  built: AlignmentBuildResult,
  projectId: string,
  userId: string,
  sources: ReviewSourceInput[],
) {
  const member = built.report.collaborators.find((c) => c.userId === userId);
  if (!member) return built.report;

  const extracted = await buildCodeCorpus(projectId, sources);
  const fullCorpus = `${workCorpusForUser(built, userId)} ${sourceMetaCorpus(sources)} ${extracted.corpus}`;
  const rescored = rescoreMemberWithCorpus(member, fullCorpus);

  return {
    ...built.report,
    collaborators: built.report.collaborators.map((c) =>
      c.userId === userId ? rescored : c,
    ),
  };
}
