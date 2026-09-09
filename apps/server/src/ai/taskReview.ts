import type { TaskReviewResult } from "./types.js";

/** Heuristic review gate — keyword overlap against criteria. */
export function heuristicReviewTaskWork(input: {
  taskTitle: string;
  taskDescription: string;
  comments: string[];
  projectRequirements: string;
  memberRequirements: string;
  positionLabel?: string;
  artifactSummary: string;
  codeExcerpt?: string;
}): TaskReviewResult {
  const criteria = `${input.projectRequirements} ${input.memberRequirements} ${input.positionLabel ?? ""}`.toLowerCase();
  const work = [
    input.taskTitle,
    input.taskDescription,
    ...input.comments,
    input.artifactSummary,
    input.codeExcerpt ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const themes = criteria
    .split(/[^a-z0-9]+/i)
    .filter((w) => w.length > 4)
    .slice(0, 20);
  const unique = [...new Set(themes)];
  const matched = unique.filter((t) => work.includes(t));
  const score = unique.length === 0 ? 70 : Math.round((matched.length / unique.length) * 100);

  const hasContent =
    work.trim().length > 30 ||
    input.artifactSummary.length > 10 ||
    (input.codeExcerpt?.trim().length ?? 0) > 20;
  const passed = hasContent && score >= 45;

  const feedback = passed
    ? `Work aligns with assigned criteria (${score}% theme match). Ready for final approval.`
    : hasContent
      ? `Needs revision — only ${score}% alignment with criteria. Add detail or artifacts addressing: ${unique.slice(0, 4).join(", ") || "project requirements"}.`
      : "Add a description, comments, or review attachments before submitting for review.";

  return { passed, feedback, score };
}
