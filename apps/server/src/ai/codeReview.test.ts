import { describe, it } from "node:test";
import assert from "node:assert/strict";
import AdmZip from "adm-zip";
import { extractTextFromZip, parseGitHubRepo } from "../lib/codeExtract.js";
import {
  analyzeCodeCorpus,
  codeReviewBlockers,
  isTechTrack,
} from "./codeReview.js";

describe("parseGitHubRepo", () => {
  it("parses standard github URLs", () => {
    const p = parseGitHubRepo("https://github.com/syncboard/app");
    assert.deepEqual(p, { owner: "syncboard", repo: "app" });
  });
});

describe("extractTextFromZip", () => {
  it("extracts source files and skips node_modules", () => {
    const zip = new AdmZip();
    zip.addFile("src/routes/auth.ts", Buffer.from("export function login() { /* jwt auth middleware */ }"));
    zip.addFile("node_modules/pkg/index.js", Buffer.from("should skip"));
    zip.addFile("README.md", Buffer.from("# API routes for partner onboarding"));

    const files = extractTextFromZip(zip.toBuffer());
    assert.equal(files.length, 2);
    assert.ok(files.some((f) => f.path.includes("auth.ts")));
    assert.ok(!files.some((f) => f.path.includes("node_modules")));
  });
});

describe("analyzeCodeCorpus", () => {
  it("scores code that matches backend requirements", () => {
    const review = analyzeCodeCorpus(
      "Server APIs, database models, auth middleware, and backend reliability",
      "backend",
      {
        corpus: "routes auth middleware prisma schema api server jwt".toLowerCase(),
        filePaths: ["src/routes/auth.ts", "prisma/schema.prisma"],
        repoReadmes: [],
        totalChars: 100,
        truncated: false,
      },
      [{ kind: "code_zip", label: "backend", fileName: "app.zip", mimeType: "application/zip", storageKey: "k", externalUrl: "" }],
    );

    assert.ok(review.score >= 40);
    assert.ok(review.structureHints.length > 0);
  });

  it("requires code sources for tech tracks", () => {
    const blockers = codeReviewBlockers({
      analyzed: false,
      isTechTrack: true,
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
    });
    assert.equal(blockers[0]?.code, "no_code_sources");
  });

  it("detects tech tracks", () => {
    assert.equal(isTechTrack("backend"), true);
    assert.equal(isTechTrack("frontend"), true);
    assert.equal(isTechTrack("ui_ux"), false);
  });
});
