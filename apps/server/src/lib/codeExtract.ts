import { readFile } from "node:fs/promises";
import AdmZip from "adm-zip";
import { reviewFilePath } from "./reviewStorage.js";

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".go", ".rs", ".java", ".kt", ".swift",
  ".md", ".html", ".css", ".scss", ".sass", ".less",
  ".vue", ".svelte", ".sql", ".yaml", ".yml", ".toml",
  ".sh", ".bash", ".rb", ".php", ".cs", ".cpp", ".c", ".h", ".hpp",
]);

const SKIP_DIR = new Set([
  "node_modules", ".git", "dist", "build", "coverage", "__pycache__",
  ".next", "vendor", "target", ".cache", ".turbo", "out",
]);

const SKIP_FILES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]);

export const MAX_CODE_FILES = 150;
export const MAX_FILE_CHARS = 100_000;
export const MAX_CORPUS_CHARS = 300_000;

export interface ExtractedCode {
  corpus: string;
  filePaths: string[];
  repoReadmes: { url: string; text: string }[];
  totalChars: number;
  truncated: boolean;
}

export type ReviewSourceInput = {
  kind: string;
  label: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  externalUrl: string;
};

function isCodePath(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  if (SKIP_FILES.has(base.toLowerCase())) return false;
  const dot = base.lastIndexOf(".");
  if (dot === -1) return base.toLowerCase() === "dockerfile" || base.toLowerCase() === "makefile";
  return CODE_EXTENSIONS.has(base.slice(dot).toLowerCase());
}

function shouldSkipDir(part: string): boolean {
  return SKIP_DIR.has(part.toLowerCase());
}

function appendText(parts: string[], paths: string[], path: string, text: string, budget: { left: number }) {
  if (budget.left <= 0 || paths.length >= MAX_CODE_FILES) return;
  const slice = text.slice(0, Math.min(text.length, MAX_FILE_CHARS, budget.left));
  if (!slice.trim()) return;
  parts.push(`\n--- ${path} ---\n${slice}`);
  paths.push(path);
  budget.left -= slice.length;
}

export function extractTextFromZip(buffer: Buffer): { path: string; text: string }[] {
  const zip = new AdmZip(buffer);
  const out: { path: string; text: string }[] = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const path = entry.entryName.replace(/\\/g, "/");
    const segments = path.split("/");
    if (segments.some((seg: string) => shouldSkipDir(seg))) continue;
    if (!isCodePath(path)) continue;
    try {
      const text = entry.getData().toString("utf8");
      if (text.includes("\0")) continue;
      out.push({ path, text });
    } catch {
      /* skip binary */
    }
  }
  return out;
}

export function extractTextFromBuffer(fileName: string, buffer: Buffer): { path: string; text: string }[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".zip")) return extractTextFromZip(buffer);
  if (isCodePath(fileName)) {
    const text = buffer.toString("utf8");
    if (text.includes("\0")) return [];
    return [{ path: fileName, text }];
  }
  return [];
}

export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.toLowerCase().includes("github.com")) return null;
    const [, owner, repo] = u.pathname.split("/");
    if (!owner || !repo || repo === "tree" || repo === "blob") return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

export function parseGitLabRepo(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.toLowerCase().includes("gitlab.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

/** Fetch README from a public GitHub repo (no API key). */
export async function fetchGitHubReadme(url: string): Promise<string | null> {
  const parsed = parseGitHubRepo(url);
  if (!parsed) return null;
  const { owner, repo } = parsed;
  const endpoints = [
    `https://api.github.com/repos/${owner}/${repo}/readme`,
    `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: endpoint.includes("api.github.com")
          ? { Accept: "application/vnd.github.raw", "User-Agent": "SyncBoard-CodeReview" }
          : { "User-Agent": "SyncBoard-CodeReview" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.trim().length > 20) return text.slice(0, MAX_FILE_CHARS);
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Best-effort GitLab README fetch. */
export async function fetchGitLabReadme(url: string): Promise<string | null> {
  const parsed = parseGitLabRepo(url);
  if (!parsed) return null;
  const { owner, repo } = parsed;
  const branches = ["main", "master"];
  for (const branch of branches) {
    const rawUrl = `https://gitlab.com/${owner}/${repo}/-/raw/${branch}/README.md`;
    try {
      const res = await fetch(rawUrl, {
        headers: { "User-Agent": "SyncBoard-CodeReview" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.trim().length > 20) return text.slice(0, MAX_FILE_CHARS);
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function buildCodeCorpus(
  projectId: string,
  sources: ReviewSourceInput[],
): Promise<ExtractedCode> {
  const parts: string[] = [];
  const filePaths: string[] = [];
  const repoReadmes: { url: string; text: string }[] = [];
  const budget = { left: MAX_CORPUS_CHARS };
  let truncated = false;

  for (const source of sources) {
    if (budget.left <= 0 || filePaths.length >= MAX_CODE_FILES) {
      truncated = true;
      break;
    }

    if (source.kind === "repo_link" && source.externalUrl) {
      const gh = await fetchGitHubReadme(source.externalUrl);
      const gl = gh ? null : await fetchGitLabReadme(source.externalUrl);
      const readme = gh ?? gl;
      if (readme) {
        repoReadmes.push({ url: source.externalUrl, text: readme });
        appendText(parts, filePaths, `repo:${source.label}`, readme, budget);
      }
      continue;
    }

    if (!source.storageKey) continue;

    let buffer: Buffer;
    try {
      buffer = await readFile(reviewFilePath(projectId, source.storageKey));
    } catch {
      continue;
    }

    const extracted = extractTextFromBuffer(source.fileName || source.label, buffer);
    for (const { path, text } of extracted) {
      if (budget.left <= 0 || filePaths.length >= MAX_CODE_FILES) {
        truncated = true;
        break;
      }
      appendText(parts, filePaths, path, text, budget);
    }
  }

  const corpus = parts.join("\n").toLowerCase();
  return {
    corpus,
    filePaths,
    repoReadmes,
    totalChars: corpus.length,
    truncated,
  };
}

export function isRepoUrl(url: string): boolean {
  return parseGitHubRepo(url) !== null || parseGitLabRepo(url) !== null;
}
