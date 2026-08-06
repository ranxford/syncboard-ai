import { extractRequirementThemes } from "./alignment.js";
import type { ExtractedCode, ReviewSourceInput } from "../lib/codeExtract.js";
import { buildCodeCorpus, isRepoUrl } from "../lib/codeExtract.js";

export const TECH_POSITION_KEYS = new Set(["backend", "frontend"]);

export interface CodeReviewResult {
  analyzed: boolean;
  isTechTrack: boolean;
  hasCodeSources: boolean;
  fileCount: number;
  totalChars: number;
  score: number;
  coveredThemes: string[];
  missingThemes: string[];
  findings: string[];
  structureHints: string[];
  repoLinks: string[];
  truncated: boolean;
}

export type CodeReviewBlockerCode =
  | "no_code_sources"
  | "code_empty"
  | "code_score_too_low"
  | "repo_unreadable";

export interface CodeReviewBlocker {
  code: CodeReviewBlockerCode;
  message: string;
}

function corpusMatchesTheme(corpus: string, theme: string): boolean {
  return corpus.includes(theme);
}

function detectStructure(filePaths: string[], positionKey: string): string[] {
  const hints: string[] = [];
  const joined = filePaths.join(" ").toLowerCase();

  const has = (re: RegExp, label: string) => {
    if (re.test(joined) && !hints.includes(label)) hints.push(label);
  };

  if (positionKey === "backend" || positionKey === "frontend") {
    has(/routes?\//, "Route handlers present");
    has(/api\//, "API modules present");
    has(/middleware/, "Middleware present");
    has(/prisma|schema\.prisma|migrations/, "Database schema/migrations present");
    has(/\.test\.|\.spec\.|__tests__/, "Tests present");
    has(/readme/i, "README included");
  }
  if (positionKey === "backend") {
    has(/server|index\.ts|app\.ts/, "Server entry point found");
    has(/controllers?/, "Controllers layer found");
  }
  if (positionKey === "frontend") {
    has(/components?\//, "Components folder found");
    has(/pages?\//, "Pages/routes found");
    has(/hooks?\//, "Custom hooks found");
    has(/\.tsx$|\.jsx$/, "React components found");
  }

  return hints.slice(0, 6);
}

export function isTechTrack(positionKey: string, projectField?: string): boolean {
  if (TECH_POSITION_KEYS.has(positionKey)) return true;
  if (projectField === "technology" && positionKey && positionKey !== "ui_ux") return true;
  return false;
}

export function hasCodeDeliverable(sources: ReviewSourceInput[]): boolean {
  return sources.some(
    (s) =>
      s.kind === "repo_link" ||
      s.kind === "code_file" ||
      s.kind === "code_zip" ||
      (s.kind === "file" && s.storageKey) ||
      s.fileName.toLowerCase().endsWith(".zip"),
  );
}

export function analyzeCodeCorpus(
  requirements: string,
  positionKey: string,
  extracted: ExtractedCode,
  sources: ReviewSourceInput[],
): CodeReviewResult {
  const repoLinks = sources.filter((s) => s.kind === "repo_link").map((s) => s.externalUrl).filter(Boolean);
  const hasCodeSources = hasCodeDeliverable(sources);
  const isTech = isTechTrack(positionKey);

  if (!hasCodeSources) {
    return {
      analyzed: false,
      isTechTrack: isTech,
      hasCodeSources: false,
      fileCount: 0,
      totalChars: 0,
      score: 0,
      coveredThemes: [],
      missingThemes: [],
      findings: [],
      structureHints: [],
      repoLinks,
      truncated: false,
    };
  }

  const themes = extractRequirementThemes(requirements);
  const keywordThemes = themes.filter((t) => !t.includes(" "));
  const scoreThemes = keywordThemes.length >= 3 ? keywordThemes : themes.slice(0, 15);

  const corpus = extracted.corpus;
  const coveredThemes: string[] = [];
  const missingThemes: string[] = [];
  for (const theme of scoreThemes) {
    if (corpusMatchesTheme(corpus, theme)) coveredThemes.push(theme);
    else missingThemes.push(theme);
  }

  const themeCoverage = scoreThemes.length === 0 ? 0 : coveredThemes.length / scoreThemes.length;
  const structureHints = detectStructure(extracted.filePaths, positionKey);

  let structureBonus = 0;
  if (positionKey === "backend") {
    if (structureHints.some((h) => /route|api|server/i.test(h))) structureBonus += 0.15;
    if (structureHints.some((h) => /test/i.test(h))) structureBonus += 0.1;
  }
  if (positionKey === "frontend") {
    if (structureHints.some((h) => /component|react/i.test(h))) structureBonus += 0.15;
    if (structureHints.some((h) => /page|route/i.test(h))) structureBonus += 0.1;
  }

  const score = Math.round(
    Math.max(0, Math.min(100, themeCoverage * 100 * (1 + structureBonus))),
  );

  const findings: string[] = [];
  const fileCount = extracted.filePaths.length;
  if (fileCount === 0 && repoLinks.length > 0) {
    findings.push("Repo link attached but no readable source files — upload a ZIP for deeper checks.");
  } else if (fileCount === 0) {
    findings.push("No readable source files found in uploads.");
  } else {
    findings.push(`Analyzed ${fileCount} file(s) (${Math.round(extracted.totalChars / 1024)} KB of text).`);
  }
  if (extracted.truncated) {
    findings.push("Large upload — analysis used the first portion of files only.");
  }
  if (missingThemes.length > 0) {
    findings.push(`Requirements not clearly reflected in code: ${missingThemes.slice(0, 4).join(", ")}.`);
  }
  if (coveredThemes.length > 0) {
    findings.push(`Matched themes in code: ${coveredThemes.slice(0, 4).join(", ")}.`);
  }

  return {
    analyzed: extracted.filePaths.length > 0 || repoLinks.length > 0,
    isTechTrack: isTech,
    hasCodeSources: true,
    fileCount: extracted.filePaths.length,
    totalChars: extracted.totalChars,
    score,
    coveredThemes: coveredThemes.slice(0, 8),
    missingThemes: missingThemes.slice(0, 8),
    findings,
    structureHints,
    repoLinks,
    truncated: extracted.truncated,
  };
}

export async function reviewMemberCode(input: {
  projectId: string;
  requirements: string;
  positionKey: string;
  projectField?: string;
  sources: ReviewSourceInput[];
}): Promise<CodeReviewResult> {
  const tech = isTechTrack(input.positionKey, input.projectField);
  if (!tech && !hasCodeDeliverable(input.sources)) {
    return {
      analyzed: false,
      isTechTrack: false,
      hasCodeSources: false,
      fileCount: 0,
      totalChars: 0,
      score: 0,
      coveredThemes: [],
      missingThemes: [],
      findings: [],
      structureHints: [],
      repoLinks: [],
      truncated: false,
    };
  }

  const extracted = await buildCodeCorpus(input.projectId, input.sources);
  return analyzeCodeCorpus(input.requirements, input.positionKey, extracted, input.sources);
}

export function codeReviewBlockers(review: CodeReviewResult): CodeReviewBlocker[] {
  const blockers: CodeReviewBlocker[] = [];
  if (!review.isTechTrack) return blockers;

  if (!review.hasCodeSources) {
    blockers.push({
      code: "no_code_sources",
      message: "Attach code — upload a ZIP or add a GitHub/GitLab repo link before submitting.",
    });
    return blockers;
  }

  if (review.repoLinks.length > 0 && review.fileCount === 0 && review.totalChars < 50) {
    blockers.push({
      code: "repo_unreadable",
      message: "Could not read the repo — check the link is public or upload a ZIP of your code.",
    });
  }

  if (review.fileCount === 0 && review.totalChars < 50) {
    blockers.push({
      code: "code_empty",
      message: "Uploads contain no readable source files (.ts, .py, .js, .md, etc.).",
    });
    return blockers;
  }

  const CODE_MIN_SCORE = 40;
  if (review.analyzed && review.score < CODE_MIN_SCORE) {
    blockers.push({
      code: "code_score_too_low",
      message: `Code alignment is ${review.score}%; requirements themes should appear in your source files (need at least ${CODE_MIN_SCORE}%).`,
    });
  }

  return blockers;
}

export { isRepoUrl };
