import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { insightsFromAlignment } from "./alignmentInsights.js";

describe("insightsFromAlignment", () => {
  it("prompts admins when there is no brief", () => {
    const insights = insightsFromAlignment({
      generatedAt: new Date().toISOString(),
      requirements: "",
      hasBrief: false,
      collaborators: [],
    });
    assert.equal(insights.length, 1);
    assert.equal(insights[0].type, "requirements");
  });

  it("flags off-track collaborators as critical", () => {
    const insights = insightsFromAlignment({
      generatedAt: new Date().toISOString(),
      requirements: "Fiber rollout eastern region compliance",
      hasBrief: true,
      collaborators: [
        {
          userId: "u2",
          name: "Linus",
          avatarColor: "#333",
          role: "member",
          positionKey: "ui_ux",
          positionLabel: "Field engineer",
          assignedRequirements: "Fiber rollout eastern region compliance",
          score: 12,
          status: "off_track",
          summary: "Most work doesn’t reflect the brief.",
          coveredThemes: [],
          missingThemes: ["fiber"],
          offTrackTasks: [{ id: "t1", title: "Party planning", reason: "No overlap" }],
          workSampleCount: 1,
        },
      ],
    });
    assert.equal(insights[0].severity, "critical");
    assert.equal(insights[0].type, "alignment");
    assert.deepEqual(insights[0].taskIds, ["t1"]);
  });
});
