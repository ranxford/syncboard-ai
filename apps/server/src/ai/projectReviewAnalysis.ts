import type { ProjectReviewAnalysis, AiMemberContext } from "./types.js";

export function heuristicProjectReviewAnalysis(input: {
  projectName: string;
  reviewTasks: { title: string; assigneeName: string; reviewStatus: string }[];
  members: AiMemberContext[];
}): ProjectReviewAnalysis {
  const pending = input.reviewTasks.filter((t) => t.reviewStatus === "pending").length;
  const failed = input.reviewTasks.filter((t) => t.reviewStatus === "failed").length;
  const passed = input.reviewTasks.filter((t) => t.reviewStatus === "passed").length;

  const blockers: string[] = [];
  if (failed > 0) blockers.push(`${failed} task(s) failed DeepSeek review — members must revise.`);
  if (pending > 0) blockers.push(`${pending} task(s) awaiting DeepSeek review.`);

  const recommendations: string[] = [];
  if (input.reviewTasks.length === 0) {
    recommendations.push("Move completed work into Review to trigger DeepSeek analysis.");
  }
  if (passed > 0 && failed === 0 && pending === 0) {
    recommendations.push("All reviewed tasks passed — ready to move to Done.");
  }

  return {
    summary: `${input.projectName}: ${input.reviewTasks.length} in Review (${passed} passed, ${failed} failed, ${pending} pending). ${input.members.length} member(s) tracked.`,
    blockers,
    recommendations,
  };
}
