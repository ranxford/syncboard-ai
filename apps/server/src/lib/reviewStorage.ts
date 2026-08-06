import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { nanoid } from "nanoid";

export const UPLOAD_ROOT = join(process.cwd(), "uploads", "review");

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/javascript",
  "text/typescript",
  "text/css",
  "text/html",
  "text/markdown",
  "text/x-python",
  "text/x-java-source",
  "application/javascript",
  "application/typescript",
  "application/json",
  "application/xml",
]);

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".go", ".rs", ".java", ".kt", ".swift",
  ".md", ".html", ".css", ".scss", ".yaml", ".yml", ".json",
  ".vue", ".sql", ".sh", ".rb", ".php", ".cs", ".cpp", ".c", ".h",
  ".zip",
]);

export const MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 MB

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime.toLowerCase());
}

export function isAllowedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  for (const ext of CODE_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

export function isAllowedUpload(mime: string, fileName: string): boolean {
  return isAllowedMime(mime) || isAllowedExtension(fileName);
}

export function isRepoUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("github.com") || host.includes("gitlab.com");
  } catch {
    return false;
  }
}

export function classifyExternalUrl(url: string): "figma_link" | "repo_link" | "link" {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("figma.com")) return "figma_link";
    if (isRepoUrl(url)) return "repo_link";
  } catch {
    /* invalid url handled elsewhere */
  }
  return "link";
}

export function classifyUploadedFile(mime: string, fileName: string, label: string): "figma_export" | "code_zip" | "code_file" | "file" {
  const hay = `${fileName} ${label}`.toLowerCase();
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".zip")) return "code_zip";
  if (isAllowedExtension(lower) && !lower.match(/\.(png|jpg|jpeg|webp|svg|pdf)$/)) {
    return "code_file";
  }

  if (/figma/.test(hay) || (mime.startsWith("image/") && /\.(png|jpg|jpeg|webp|svg)$/i.test(fileName))) {
    return "figma_export";
  }
  if (mime === "application/pdf" && /figma|design|mockup|ui|ux|wireframe/.test(hay)) {
    return "figma_export";
  }
  return "file";
}

export async function saveReviewFile(
  projectId: string,
  buffer: Buffer,
  originalName: string,
): Promise<string> {
  const dir = join(UPLOAD_ROOT, projectId);
  await mkdir(dir, { recursive: true });
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const storageKey = `${nanoid(12)}-${safe}`;
  await writeFile(join(dir, storageKey), buffer);
  return storageKey;
}

export function reviewFilePath(projectId: string, storageKey: string): string {
  return join(UPLOAD_ROOT, projectId, storageKey);
}

export async function deleteReviewFile(projectId: string, storageKey: string): Promise<void> {
  if (!storageKey) return;
  try {
    await unlink(reviewFilePath(projectId, storageKey));
  } catch {
    /* already gone */
  }
}
