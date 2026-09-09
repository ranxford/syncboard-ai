import { test } from "node:test";
import assert from "node:assert/strict";
import { heuristicReviewTaskWork } from "./taskReview.js";

test("heuristic review passes when work matches criteria themes", () => {
  const result = heuristicReviewTaskWork({
    taskTitle: "Implement authentication API",
    taskDescription: "JWT login endpoints with middleware security",
    comments: ["Added route handlers and tests"],
    projectRequirements: "Build secure authentication with JWT middleware",
    memberRequirements: "Backend API routes and security middleware",
    artifactSummary: "repo_link: github.com/example/api",
  });
  assert.ok(result.score >= 40);
});

test("heuristic review fails with empty work", () => {
  const result = heuristicReviewTaskWork({
    taskTitle: "Task",
    taskDescription: "",
    comments: [],
    projectRequirements: "Deliver comprehensive documentation",
    memberRequirements: "Write documentation",
    artifactSummary: "",
  });
  assert.equal(result.passed, false);
});
