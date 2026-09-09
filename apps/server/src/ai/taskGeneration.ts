import type { GeneratedMemberTask, AiMemberContext } from "./types.js";

/** Heuristic fallback when DeepSeek is unavailable. */
export function heuristicGenerateMemberTasks(input: {
  instruction: string;
  members: AiMemberContext[];
}): GeneratedMemberTask[] {
  const snippet = input.instruction.trim().slice(0, 120) || "Complete assigned work";
  return input.members.map((m) => ({
    assigneeId: m.id,
    title: `${snippet} — ${m.positionLabel || m.name}`,
    description: m.assignedRequirements
      ? `Focus: ${m.assignedRequirements.slice(0, 300)}`
      : input.instruction.slice(0, 500),
    priority: "medium" as const,
  }));
}
