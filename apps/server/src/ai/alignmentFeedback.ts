import OpenAI from "openai";
import { env } from "../env.js";
import type { AlignmentReport, CollaboratorAlignment } from "./alignment.js";

export interface CollaboratorFeedback {
  feedback: string;
  suggestions: string[];
}

function heuristicCollaboratorFeedback(
  requirements: string,
  member: CollaboratorAlignment,
  workLines: string[],
): CollaboratorFeedback {
  const suggestions: string[] = [];

  if (member.missingThemes.length > 0) {
    suggestions.push(
      `Reflect these themes from your assigned criteria in task and timeline titles: ${member.missingThemes.slice(0, 5).join(", ")}.`,
    );
  }
  for (const t of member.offTrackTasks.slice(0, 3)) {
    suggestions.push(`Reframe or replace “${t.title}” so it connects to your role criteria.`);
  }
  if (member.workSampleCount === 0) {
    suggestions.push(
      "Assign yourself open tasks (or update your personal timeline) that describe what you’re delivering.",
    );
  }
  if (suggestions.length === 0 && member.status === "aligned") {
    suggestions.push("Keep task wording aligned with the project standard as you finish remaining work.");
  }

  const workPreview =
    workLines.length > 0
      ? ` Current work sampled: ${workLines.slice(0, 4).join("; ")}${workLines.length > 4 ? "…" : ""}.`
      : "";

  const feedback =
    member.status === "no_brief"
      ? member.positionLabel
        ? `Waiting for admin to set analyzer criteria for ${member.positionLabel}.`
        : "Waiting for the project admin to assign your role criteria."
      : `${member.summary}${workPreview} Score ${member.score}% vs your assigned criteria.`;

  return { feedback, suggestions: suggestions.slice(0, 5) };
}

async function openAiCollaboratorFeedback(
  requirements: string,
  member: CollaboratorAlignment,
  workLines: string[],
): Promise<CollaboratorFeedback | null> {
  if (env.ai.provider !== "openai" || !env.ai.openaiApiKey) return null;

  const client = new OpenAI({ apiKey: env.ai.openaiApiKey });
  try {
    const completion = await client.chat.completions.create({
      model: env.ai.openaiModel,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a project coach. The admin published a project standard. " +
            "Compare the member's work items to that standard. Return JSON: " +
            '"feedback" (2-4 sentences, direct, encouraging, no markdown), ' +
            '"suggestions" (string array, 1-5 concrete edits to tasks/timeline wording). ' +
            "Do not ask the member to type documentation; focus on board/timeline alignment.",
        },
        {
          role: "user",
          content: JSON.stringify({
            projectStandard: requirements.slice(0, 3000),
            memberName: member.name,
            alignmentScore: member.score,
            alignmentStatus: member.status,
            missingThemes: member.missingThemes,
            offTrackTasks: member.offTrackTasks.map((t) => t.title),
            workItems: workLines.slice(0, 20),
          }),
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<CollaboratorFeedback>;
    if (!parsed.feedback) return null;
    return {
      feedback: parsed.feedback,
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s): s is string => typeof s === "string").slice(0, 5)
        : [],
    };
  } catch (err) {
    console.error("[ai] alignment feedback failed, using template:", err);
    return null;
  }
}

/** Automatic feedback for a collaborator — OpenAI when configured, else structured templates. */
export async function generateCollaboratorFeedback(
  requirements: string,
  member: CollaboratorAlignment,
  workLines: string[],
): Promise<CollaboratorFeedback> {
  if (!requirements.trim() || member.status === "no_brief") {
    return heuristicCollaboratorFeedback(requirements, member, workLines);
  }

  const fromLlm = await openAiCollaboratorFeedback(requirements, member, workLines);
  if (fromLlm) return fromLlm;
  return heuristicCollaboratorFeedback(requirements, member, workLines);
}

export async function enrichAlignmentWithFeedback(
  report: AlignmentReport,
  tasksByAssignee: Map<string, { title: string; description: string }[]>,
  milestonesByOwner: Map<string, { title: string; description: string }[]>,
): Promise<AlignmentReport> {
  const collaborators = await Promise.all(
    report.collaborators.map(async (member) => {
      const tasks = tasksByAssignee.get(member.userId) ?? [];
      const milestones = milestonesByOwner.get(member.userId) ?? [];
      const openLines = [
        ...tasks.map((t) => `${t.title} ${t.description}`.trim()),
        ...milestones.map((m) => `${m.title} ${m.description}`.trim()),
      ].filter((l) => l.length > 0);

      const { feedback, suggestions } = await generateCollaboratorFeedback(
        member.assignedRequirements || report.requirements,
        member,
        openLines,
      );

      return { ...member, aiFeedback: feedback, aiSuggestions: suggestions };
    }),
  );

  return { ...report, collaborators };
}
