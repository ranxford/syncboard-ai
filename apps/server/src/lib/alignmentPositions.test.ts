import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fieldAlignmentMeta,
  resolveMemberBrief,
  tracksForField,
} from "../lib/alignmentPositions.js";

describe("alignmentPositions by field", () => {
  it("returns agriculture tracks for agriculture projects", () => {
    const tracks = tracksForField("agriculture");
    assert.equal(tracks.length, 3);
    assert.ok(tracks.some((t) => t.key === "crop"));
    assert.ok(tracks.some((t) => t.key === "livestock"));
    assert.ok(tracks.some((t) => t.key === "market"));
  });

  it("returns education tracks for education projects", () => {
    const tracks = tracksForField("education");
    assert.ok(tracks.some((t) => t.key === "curriculum"));
    assert.ok(tracks.some((t) => t.key === "students"));
  });

  it("keeps technology backend/frontend/ui_ux tracks", () => {
    const tracks = tracksForField("technology");
    assert.deepEqual(
      tracks.map((t) => t.key),
      ["backend", "frontend", "ui_ux"],
    );
  });

  it("applies field-specific default criteria on resolve", () => {
    const resolved = resolveMemberBrief({
      field: "agriculture",
      positionKey: "crop",
      positionLabel: "",
      assignedRequirements: "",
    });
    assert.equal(resolved.positionLabel, "Crop & fields");
    assert.ok(resolved.assignedRequirements.toLowerCase().includes("irrigation"));
  });

  it("exposes field meta for alignment API", () => {
    const meta = fieldAlignmentMeta("education");
    assert.equal(meta.projectField, "education");
    assert.equal(meta.fieldLabel, "Education");
    assert.equal(meta.positionTracks.length, 3);
  });
});
