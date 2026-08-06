import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateCollaboratorFeedback } from "./alignmentFeedback.js";

describe("generateCollaboratorFeedback", () => {
  it("builds automatic template feedback without OpenAI", async () => {
    const fb = await generateCollaboratorFeedback(
      "Fiber rollout and compliance in eastern region",
      {
        userId: "u1",
        name: "Sam",
        avatarColor: "#111",
        role: "member",
        positionKey: "",
        positionLabel: "",
        assignedRequirements: "Fiber rollout and compliance in eastern region",
        score: 40,
        status: "drifting",
        summary: "Some themes missing.",
        coveredThemes: ["fiber"],
        missingThemes: ["compliance", "eastern"],
        offTrackTasks: [],
        workSampleCount: 2,
      },
      ["Tower survey", "Fiber splice plan"],
    );
    assert.ok(fb.feedback.includes("40%"));
    assert.ok(fb.suggestions.length >= 1);
  });
});
