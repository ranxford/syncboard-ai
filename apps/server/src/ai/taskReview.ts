import type { TaskReviewResult } from "./types.js";

/** Heuristic review gate — keyword overlap against criteria. */
export function heuristicReviewTaskWork(input: {
  taskTitle: string;
  taskDescription: string;
  comments: string[];
  projectRequirements: string;
  memberRequirements: string;
  artifactSummary: string;
}): TaskReviewResult {
  const criteria = `${input.projectRequirements} ${input.memberRequirements}`.toLowerCase();
  const work = [
    input.taskTitle,
    input.taskDescription,
    ...input.comments,
    input.artifactSummary,
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

  const hasContent = work.trim().length > 30 || input.artifactSummary.length > 10;
  const passed = hasContent && score >= 45;

  const feedback = passed
    ? `Work aligns with assigned criteria (${score}% theme match). Ready for final approval.`
    : hasContent
      ? `Needs revision — only ${score}% alignment with criteria. Add detail or artifacts addressing: ${unique.slice(0, 4).join(", ") || "project requirements"}.`
      : "Add a description, comments, or review attachments before submitting for DeepSeek review.";

  return { passed, feedback, score };
}
