/** Compare collaborator work to the manager's project requirements (deterministic, explainable). */

import { codeReviewBlockers, type CodeReviewResult } from "./codeReview.js";

export type AlignmentStatus = "aligned" | "drifting" | "off_track" | "no_brief";

export interface AlignmentReport {
  generatedAt: string;
  requirements: string;
  hasBrief: boolean;
  collaborators: CollaboratorAlignment[];
}

const STOP = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "as", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "should", "could", "may", "might", "must", "can",
  "this", "that", "these", "those", "it", "its", "they", "them", "their", "we", "our", "you",
  "your", "all", "each", "every", "any", "some", "not", "no", "yes", "into", "through",
  "during", "before", "after", "above", "below", "between", "under", "over", "about",
  "than", "then", "so", "if", "when", "where", "who", "what", "which", "how", "why",
  "project", "team", "work", "task", "tasks", "member", "members",
]);

/** Short phrases (2–3 words) and single keywords from the manager brief. */
export function extractRequirementThemes(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^\w\s-]/g, " ");
  const words = normalized.split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  const themes = new Set<string>();
  for (const w of words) themes.add(w);
  for (let i = 0; i < words.length - 1; i++) {
    themes.add(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) themes.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return [...themes].slice(0, 40);
}

function corpusMatchesTheme(corpus: string, theme: string): boolean {
  return corpus.includes(theme);
}

function statusFromScore(score: number, hasWork: boolean): AlignmentStatus {
  if (!hasWork) return "drifting";
  if (score >= 65) return "aligned";
  if (score >= 35) return "drifting";
  return "off_track";
}

export interface CollaboratorAlignment {
  userId: string;
  name: string;
  avatarColor: string;
  role: string;
  /** backend | frontend | ui_ux | custom | "" */
  positionKey: string;
  positionLabel: string;
  /** Criteria this member is scored against (position-specific or project fallback). */
  assignedRequirements: string;
  score: number; // 0–100
  status: AlignmentStatus;
  summary: string;
  coveredThemes: string[];
  missingThemes: string[];
  offTrackTasks: { id: string; title: string; reason: string }[];
  workSampleCount: number;
  /** Auto-generated coach text (no manual entry by member). */
  aiFeedback?: string;
  aiSuggestions?: string[];
}

export interface MemberBriefInput {
  positionKey?: string;
  positionLabel?: string;
  assignedRequirements?: string;
}

function effectiveRequirements(projectRequirements: string, brief?: MemberBriefInput): string {
  const personal = brief?.assignedRequirements?.trim() ?? "";
  const project = projectRequirements.trim();
  if (personal) return personal;
  return project;
}

function analyzeOneMember(
  member: { id: string; name: string; avatarColor: string; role: string },
  requirementsText: string,
  positionKey: string,
  positionLabel: string,
  tasks: { id: string; title: string; description: string; completedAt: Date | null }[],
  milestones: { title: string; description: string; status: string }[],
): CollaboratorAlignment {
  const requirements = requirementsText.trim();
  const themes = extractRequirementThemes(requirements);
  const keywordThemes = themes.filter((t) => !t.includes(" "));
  const scoreThemes = keywordThemes.length >= 3 ? keywordThemes : themes.slice(0, 15);
  const hasBrief = requirements.length >= 20 && scoreThemes.length >= 3;

  if (!hasBrief) {
    return {
      userId: member.id,
      name: member.name,
      avatarColor: member.avatarColor,
      role: member.role,
      positionKey,
      positionLabel,
      assignedRequirements: requirements,
      score: 0,
      status: "no_brief",
      summary: positionLabel
        ? `Waiting for admin to set analyzer criteria for ${positionLabel}.`
        : "Waiting for admin to assign your role criteria or project standard.",
      coveredThemes: [],
      missingThemes: [],
      offTrackTasks: [],
      workSampleCount: 0,
    };
  }

  const openTasks = tasks.filter((t) => !t.completedAt);
  const workLines = [
    ...openTasks.map((t) => `${t.title} ${t.description}`),
    ...milestones.map((m) => `${m.title} ${m.description}`),
  ];
  const corpus = workLines.join(" ").toLowerCase();
  const workSampleCount = workLines.length;

  const coveredThemes: string[] = [];
  const missingThemes: string[] = [];
  for (const theme of scoreThemes) {
    if (corpusMatchesTheme(corpus, theme)) coveredThemes.push(theme);
    else missingThemes.push(theme);
  }

  const themeCoverage =
    scoreThemes.length === 0 ? 0 : coveredThemes.length / scoreThemes.length;

  const offTrackTasks = openTasks
    .filter((t) => {
      const blob = `${t.title} ${t.description}`.toLowerCase();
      if (blob.trim().length < 3) return false;
      return !themes.some((theme) => blob.includes(theme));
    })
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: t.title,
      reason: "No overlap with your assigned criteria",
    }));

  const offTrackPenalty = Math.min(0.4, offTrackTasks.length * 0.08);
  const score = Math.round(
    Math.max(0, Math.min(100, themeCoverage * 100 * (1 - offTrackPenalty))),
  );
  const status = statusFromScore(score, workSampleCount > 0);

  let summary: string;
  if (workSampleCount === 0) {
    summary =
      "No open assigned tasks or personal timeline items to compare against your role criteria.";
  } else if (status === "aligned") {
    summary = positionLabel
      ? `${positionLabel} track — work matches your assigned criteria (personal timeline only).`
      : "Work lines up with assigned criteria (your tasks and timeline only).";
  } else if (status === "drifting") {
    summary = `${positionLabel ? `${positionLabel}: ` : ""}Some criteria themes missing (${missingThemes.slice(0, 3).join(", ") || "see gaps"}).`;
  } else {
    summary = `${positionLabel ? `${positionLabel}: ` : ""}Work doesn’t reflect your role criteria — update your tasks or personal timeline.`;
  }

  return {
    userId: member.id,
    name: member.name,
    avatarColor: member.avatarColor,
    role: member.role,
    positionKey,
    positionLabel,
    assignedRequirements: requirements,
    score,
    status,
    summary,
    coveredThemes: coveredThemes.slice(0, 8),
    missingThemes: missingThemes.slice(0, 8),
    offTrackTasks,
    workSampleCount,
  };
}

/** Re-score a member when deliverable labels/files are included in the corpus. */
export function rescoreMemberWithCorpus(
  member: CollaboratorAlignment,
  fullCorpus: string,
): CollaboratorAlignment {
  if (member.status === "no_brief") return member;

  const requirements = member.assignedRequirements.trim();
  const themes = extractRequirementThemes(requirements);
  const keywordThemes = themes.filter((t) => !t.includes(" "));
  const scoreThemes = keywordThemes.length >= 3 ? keywordThemes : themes.slice(0, 15);
  const corpus = fullCorpus.toLowerCase();
  const hasWork = member.workSampleCount > 0 || corpus.trim().length >= 20;

  const coveredThemes: string[] = [];
  const missingThemes: string[] = [];
  for (const theme of scoreThemes) {
    if (corpusMatchesTheme(corpus, theme)) coveredThemes.push(theme);
    else missingThemes.push(theme);
  }

  const themeCoverage =
    scoreThemes.length === 0 ? 0 : coveredThemes.length / scoreThemes.length;
  const offTrackPenalty = Math.min(0.4, member.offTrackTasks.length * 0.08);
  const score = Math.round(
    Math.max(0, Math.min(100, themeCoverage * 100 * (1 - offTrackPenalty))),
  );
  const status = statusFromScore(score, hasWork);

  let summary = member.summary;
  if (status === "aligned") {
    summary = member.positionLabel
      ? `${member.positionLabel} track — work and deliverables match your assigned criteria.`
      : "Work and deliverables line up with assigned criteria.";
  } else if (status === "drifting") {
    summary = `${member.positionLabel ? `${member.positionLabel}: ` : ""}Some criteria themes missing (${missingThemes.slice(0, 3).join(", ") || "see gaps"}).`;
  } else if (hasWork) {
    summary = `${member.positionLabel ? `${member.positionLabel}: ` : ""}Update tasks, timeline, or deliverables to reflect your role criteria.`;
  }

  return {
    ...member,
    score,
    status,
    summary,
    coveredThemes: coveredThemes.slice(0, 8),
    missingThemes: missingThemes.slice(0, 8),
  };
}

export function analyzeCollaboratorAlignment(input: {
  projectRequirements: string;
  memberBriefs?: Map<string, MemberBriefInput>;
  members: { id: string; name: string; avatarColor: string; role: string }[];
  tasksByAssignee: Map<
    string,
    { id: string; title: string; description: string; completedAt: Date | null }[]
  >;
  milestonesByOwner: Map<string, { title: string; description: string; status: string }[]>;
}): AlignmentReport {
  const projectRequirements = input.projectRequirements.trim();
  const memberBriefs = input.memberBriefs ?? new Map();

  const collaborators: CollaboratorAlignment[] = input.members
    .filter((m) => m.role === "member")
    .map((member) => {
      const brief = memberBriefs.get(member.id);
      const positionKey = brief?.positionKey?.trim() ?? "";
      const positionLabel = brief?.positionLabel?.trim() ?? "";
      const reqText = effectiveRequirements(projectRequirements, brief);
      return analyzeOneMember(
        member,
        reqText,
        positionKey,
        positionLabel,
        input.tasksByAssignee.get(member.id) ?? [],
        input.milestonesByOwner.get(member.id) ?? [],
      );
    });

  const projectHasBrief =
    projectRequirements.length >= 20 &&
    extractRequirementThemes(projectRequirements).filter((t) => !t.includes(" ")).length >= 3;
  const anyMemberBrief = collaborators.some((c) => c.assignedRequirements.length >= 20);

  return {
    generatedAt: new Date().toISOString(),
    requirements: projectRequirements,
    hasBrief: projectHasBrief || anyMemberBrief,
    collaborators,
  };
}

export type SubmissionBlockerCode =
  | "no_brief"
  | "not_a_member"
  | "no_work"
  | "off_track"
  | "score_too_low"
  | "off_track_tasks"
  | "no_code_sources"
  | "code_empty"
  | "code_score_too_low"
  | "repo_unreadable";

export interface SubmissionReadiness {
  ready: boolean;
  score: number;
  status: AlignmentStatus;
  blockers: { code: SubmissionBlockerCode; message: string }[];
  member: CollaboratorAlignment | null;
  codeReview?: CodeReviewResult | null;
}

const SUBMIT_MIN_SCORE = 60;

/** Gate before a member can submit their deliverable to the project admin. */
export function evaluateSubmissionReadiness(
  report: AlignmentReport,
  userId: string,
  codeReview?: CodeReviewResult | null,
): SubmissionReadiness {
  const member = report.collaborators.find((c) => c.userId === userId) ?? null;
  const blockers: SubmissionReadiness["blockers"] = [];

  if (member && member.status === "no_brief") {
    blockers.push({
      code: "no_brief",
      message:
        "Admin has not assigned criteria for your role yet — ask them to set it in Alignment.",
    });
  } else if (!report.hasBrief) {
    blockers.push({
      code: "no_brief",
      message: "The project manager has not published requirements yet.",
    });
  }
  if (!member) {
    blockers.push({
      code: "not_a_member",
      message: "Only members with assigned work can submit a deliverable.",
    });
  }
  if (member && member.workSampleCount === 0) {
    blockers.push({
      code: "no_work",
      message:
        "Add open assigned tasks or personal timeline items that reflect the requirements before submitting.",
    });
  }
  if (member && member.status === "off_track") {
    blockers.push({
      code: "off_track",
      message: member.summary,
    });
  }
  if (member && member.score < SUBMIT_MIN_SCORE) {
    blockers.push({
      code: "score_too_low",
      message: `Alignment score is ${member.score}%; you need at least ${SUBMIT_MIN_SCORE}% to submit.`,
    });
  }
  if (member && member.offTrackTasks.length > 0) {
    blockers.push({
      code: "off_track_tasks",
      message: `Fix or reword off-track tasks: ${member.offTrackTasks.map((t) => t.title).join(", ")}.`,
    });
  }

  if (codeReview?.isTechTrack) {
    for (const b of codeReviewBlockers(codeReview)) {
      blockers.push({ code: b.code as SubmissionBlockerCode, message: b.message });
    }
  }

  let score = member?.score ?? 0;
  if (member && codeReview?.analyzed && codeReview.fileCount > 0) {
    score = Math.round(member.score * 0.5 + codeReview.score * 0.5);
    if (score < SUBMIT_MIN_SCORE && !blockers.some((b) => b.code === "score_too_low")) {
      blockers.push({
        code: "score_too_low",
        message: `Combined alignment score is ${score}%; you need at least ${SUBMIT_MIN_SCORE}% to submit.`,
      });
    }
  }

  return {
    ready: blockers.length === 0 && member !== null,
    score,
    status: member?.status ?? "no_brief",
    blockers,
    member,
    codeReview: codeReview ?? null,
  };
}
