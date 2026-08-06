import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateReviewBrief } from "./reviewBrief.js";

describe("generateReviewBrief", () => {
  it("includes figma sources and alignment in brief", () => {
    const brief = generateReviewBrief({
      memberName: "Linus",
      positionLabel: "UI / UX",
      assignedRequirements: "Wireframes and accessible layouts for citizen portal.",
      projectRequirements: "Government digital service project.",
      alignmentScore: 72,
      alignmentStatus: "partial",
      memberSummary: "Most tasks align; missing accessibility theme.",
      sources: [
        {
          id: "1",
          projectId: "p",
          userId: "u",
          submissionId: "s",
          kind: "figma_link",
          label: "Portal mockups",
          fileName: "",
          mimeType: "",
          fileSize: 0,
          externalUrl: "https://figma.com/file/abc",
          note: "Final frames in page 2",
          createdAt: new Date().toISOString(),
          downloadUrl: null,
        },
      ],
    });

    assert.match(brief, /Linus/);
    assert.match(brief, /Figma/);
    assert.match(brief, /72%/);
    assert.match(brief, /Portal mockups/);
  });
});
