import type { ReviewSourceRow } from "../lib/reviewSources.js";
import type { CodeReviewResult } from "./codeReview.js";

export interface ReviewBriefInput {
  memberName: string;
  positionLabel: string;
  assignedRequirements: string;
  projectRequirements: string;
  alignmentScore: number;
  alignmentStatus: string;
  memberSummary: string;
  sources: ReviewSourceRow[];
  codeReview?: CodeReviewResult | null;
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "figma_link":
      return "Figma design link";
    case "figma_export":
      return "Figma export / design file";
    case "repo_link":
      return "GitHub / GitLab repo";
    case "code_zip":
      return "Code archive (ZIP)";
    case "code_file":
      return "Source file";
    case "link":
      return "Reference link";
    default:
      return "Uploaded file";
  }
}

function sourceLine(s: ReviewSourceRow): string {
  const base = `- **${s.label}** (${kindLabel(s.kind)})`;
  if (s.externalUrl) return `${base} — ${s.externalUrl}`;
  if (s.fileName) return `${base} — ${s.fileName}${s.fileSize ? ` (${Math.round(s.fileSize / 1024)} KB)` : ""}`;
  return base;
}

/** NotebookLM-style admin brief over submission sources + alignment (heuristic, no API keys). */
export function generateReviewBrief(input: ReviewBriefInput): string {
  const {
    memberName,
    positionLabel,
    assignedRequirements,
    projectRequirements,
    alignmentScore,
    alignmentStatus,
    memberSummary,
    sources,
    codeReview,
  } = input;

  const lines: string[] = [];
  lines.push(`# Review brief — ${memberName}`);
  lines.push("");
  lines.push(`**Track:** ${positionLabel || "Collaborator"}`);
  lines.push(`**Alignment at submit:** ${alignmentScore}% (${alignmentStatus.replace(/_/g, " ")})`);
  lines.push("");

  if (memberSummary.trim()) {
    lines.push("## AI alignment summary");
    lines.push(memberSummary.trim());
    lines.push("");
  }

  if (codeReview?.analyzed) {
    lines.push("## Code review (automated)");
    lines.push(`**Code alignment score:** ${codeReview.score}%`);
    lines.push(`**Files analyzed:** ${codeReview.fileCount}`);
    for (const f of codeReview.findings) lines.push(`- ${f}`);
    if (codeReview.structureHints.length > 0) {
      lines.push("");
      lines.push("**Structure detected:**");
      for (const h of codeReview.structureHints) lines.push(`- ${h}`);
    }
    if (codeReview.missingThemes.length > 0) {
      lines.push("");
      lines.push(`**Requirements not found in code:** ${codeReview.missingThemes.slice(0, 5).join(", ")}`);
    }
    lines.push("");
  }

  lines.push(`## Review sources (${sources.length})`);
  if (sources.length === 0) {
    lines.push(
      "_No files or links were attached. Ask the member to add Figma exports, code ZIPs, repo links, or PDFs before the next submit._",
    );
  } else {
    for (const s of sources) {
      lines.push(sourceLine(s));
      if (s.note.trim()) lines.push(`  - Note: ${s.note.trim()}`);
    }
  }
  lines.push("");

  lines.push("## What to verify");
  const checks: string[] = [];

  const hasCode =
    codeReview?.hasCodeSources ||
    sources.some((s) => s.kind === "repo_link" || s.kind === "code_zip" || s.kind === "code_file");

  if (hasCode) {
    checks.push("Do the uploaded source files implement the assigned backend/frontend requirements?");
    checks.push("Are API routes, components, or tests present where the brief expects them?");
    if (codeReview && codeReview.score < 60) {
      checks.push("Code alignment was low — spot-check whether requirement keywords appear in the actual implementation.");
    }
  }
  if (sources.some((s) => s.kind === "figma_link" || s.kind === "figma_export")) {
    checks.push("Do the Figma frames/exports match the assigned UI/UX or design criteria?");
    checks.push("Are layout, accessibility, and project-field conventions reflected in the design?");
  }
  if (sources.some((s) => s.mimeType === "application/pdf" || s.fileName.endsWith(".pdf"))) {
    checks.push("Does the PDF document cover the deliverables listed in the member's timeline?");
  }
  if (assignedRequirements.trim()) {
    checks.push(
      `Cross-check against **${positionLabel || "role"} criteria**: ${assignedRequirements.slice(0, 280)}${assignedRequirements.length > 280 ? "…" : ""}`,
    );
  } else if (projectRequirements.trim()) {
    checks.push(
      `Cross-check against the **project standard**: ${projectRequirements.slice(0, 280)}${projectRequirements.length > 280 ? "…" : ""}`,
    );
  }
  checks.push("Compare board tasks + personal timeline with what was uploaded — gaps should trigger revision.");
  if (alignmentScore < 80) {
    checks.push("Alignment was below 80% — confirm whether the uploaded work closes the gaps flagged at submit.");
  }

  for (const c of checks.slice(0, 8)) lines.push(`- ${c}`);
  lines.push("");

  lines.push("## Suggested admin questions");
  lines.push(`- Does this deliverable satisfy ${positionLabel || "their track"} requirements end-to-end?`);
  if (hasCode) {
    lines.push("- Can you run or demo the code from what was submitted?");
    lines.push("- Which files are the main entry points vs helpers?");
  }
  if (sources.some((s) => s.kind.startsWith("figma"))) {
    lines.push("- Which Figma frames are final vs work-in-progress?");
  }
  lines.push("- What should change before you accept or request revision?");
  lines.push("");
  lines.push("_Generated automatically from submission sources and alignment data — edit your reviewer note as needed._");

  return lines.join("\n");
}
