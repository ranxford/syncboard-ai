import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeCollaboratorAlignment, evaluateSubmissionReadiness, extractRequirementThemes, rescoreMemberWithCorpus } from "./alignment.js";

describe("extractRequirementThemes", () => {
  it("pulls keywords from a manager brief", () => {
    const themes = extractRequirementThemes(
      "Deliver Q3 partner onboarding. Focus on safety compliance and site surveys.",
    );
    assert.ok(themes.includes("onboarding"));
    assert.ok(themes.includes("safety"));
    assert.ok(themes.includes("compliance"));
  });
});

describe("analyzeCollaboratorAlignment", () => {
  it("marks aligned work when tasks match the brief", () => {
    const report = analyzeCollaboratorAlignment({
      projectRequirements: "Partner onboarding, safety compliance, weekly site surveys",
      members: [
        { id: "u1", name: "Ada", avatarColor: "#111", role: "admin" },
        { id: "u2", name: "Grace", avatarColor: "#222", role: "member" },
      ],
      tasksByAssignee: new Map([
        [
          "u2",
          [
            {
              id: "t1",
              title: "Partner onboarding checklist",
              description: "Safety compliance review",
              completedAt: null,
            },
          ],
        ],
      ]),
      milestonesByOwner: new Map([
        ["u2", [{ title: "Site survey week 2", description: "", status: "active" }]],
      ]),
    });

    assert.equal(report.hasBrief, true);
    assert.equal(report.collaborators.length, 1);
    assert.equal(report.collaborators[0].userId, "u2");
    assert.ok(report.collaborators[0].score >= 50);
    assert.notEqual(report.collaborators[0].status, "off_track");
  });

  it("flags off-track tasks with no thematic overlap", () => {
    const report = analyzeCollaboratorAlignment({
      projectRequirements: "Telecom tower rollout and fiber installation in eastern region",
      members: [{ id: "u2", name: "Linus", avatarColor: "#333", role: "member" }],
      tasksByAssignee: new Map([
        [
          "u2",
          [
            {
              id: "t9",
              title: "Plan office birthday party",
              description: "Unrelated social event",
              completedAt: null,
            },
          ],
        ],
      ]),
      milestonesByOwner: new Map(),
    });

    assert.equal(report.collaborators[0].offTrackTasks.length, 1);
    assert.ok(report.collaborators[0].score < 50);
  });

  it("blocks submission when requirements are not met", () => {
    const report = analyzeCollaboratorAlignment({
      projectRequirements: "Telecom tower rollout and fiber installation in eastern region",
      members: [{ id: "u2", name: "Linus", avatarColor: "#333", role: "member" }],
      tasksByAssignee: new Map([
        [
          "u2",
          [
            {
              id: "t9",
              title: "Plan office birthday party",
              description: "Unrelated social event",
              completedAt: null,
            },
          ],
        ],
      ]),
      milestonesByOwner: new Map(),
    });
    const readiness = evaluateSubmissionReadiness(report, "u2");
    assert.equal(readiness.ready, false);
    assert.ok(readiness.blockers.length > 0);
  });

  it("allows submission when work matches the brief", () => {
    const report = analyzeCollaboratorAlignment({
      projectRequirements: "Partner onboarding, safety compliance, weekly site surveys",
      members: [{ id: "u2", name: "Grace", avatarColor: "#222", role: "member" }],
      tasksByAssignee: new Map([
        [
          "u2",
          [
            {
              id: "t1",
              title: "Partner onboarding checklist",
              description: "Safety compliance review",
              completedAt: null,
            },
          ],
        ],
      ]),
      milestonesByOwner: new Map([
        ["u2", [{ title: "Site survey week 2", description: "", status: "active" }]],
      ]),
    });
    const readiness = evaluateSubmissionReadiness(report, "u2");
    assert.equal(readiness.ready, true);
  });

  it("scores members against role-specific criteria when assigned", () => {
    const report = analyzeCollaboratorAlignment({
      projectRequirements: "Generic project launch goals",
      memberBriefs: new Map([
        [
          "u2",
          {
            positionKey: "ui_ux",
            positionLabel: "UX engineer",
            assignedRequirements: "Onboarding UX, auth polish, accessibility audit, demo documentation",
          },
        ],
      ]),
      members: [{ id: "u2", name: "Linus", avatarColor: "#333", role: "member" }],
      tasksByAssignee: new Map([
        [
          "u2",
          [
            {
              id: "t1",
              title: "Accessibility audit",
              description: "Onboarding UX polish",
              completedAt: null,
            },
          ],
        ],
      ]),
      milestonesByOwner: new Map(),
    });

    assert.equal(report.collaborators[0].positionKey, "ui_ux");
    assert.equal(report.collaborators[0].positionLabel, "UX engineer");
    assert.ok(report.collaborators[0].score >= 50);
    assert.notEqual(report.collaborators[0].status, "off_track");
  });

  it("boosts score when deliverable labels match criteria", () => {
    const report = analyzeCollaboratorAlignment({
      projectRequirements: "Generic project launch goals",
      memberBriefs: new Map([
        [
          "u2",
          {
            positionKey: "ui_ux",
            positionLabel: "UX engineer",
            assignedRequirements: "Onboarding UX, auth polish, accessibility audit, demo documentation",
          },
        ],
      ]),
      members: [{ id: "u2", name: "Linus", avatarColor: "#333", role: "member" }],
      tasksByAssignee: new Map([
        [
          "u2",
          [{ id: "t1", title: "Misc task", description: "placeholder", completedAt: null }],
        ],
      ]),
      milestonesByOwner: new Map(),
    });

    const low = report.collaborators[0];
    assert.ok(low.score < 60);

    const boosted = rescoreMemberWithCorpus(
      low,
      "misc task placeholder onboarding ux auth polish accessibility audit demo documentation figma export",
    );
    assert.ok(boosted.score >= 60);
    assert.notEqual(boosted.status, "off_track");
  });
});
