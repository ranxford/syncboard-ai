import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLabels, serializeLabels } from "./labels.js";

test("parseLabels reads a JSON string array", () => {
  assert.deepEqual(parseLabels('["bug","ui"]'), ["bug", "ui"]);
});

test("parseLabels returns [] for the default empty value", () => {
  assert.deepEqual(parseLabels("[]"), []);
});

test("parseLabels ignores non-string entries", () => {
  assert.deepEqual(parseLabels('["ok", 5, null, "fine"]'), ["ok", "fine"]);
});

test("parseLabels returns [] for invalid JSON", () => {
  assert.deepEqual(parseLabels("not json"), []);
  assert.deepEqual(parseLabels(""), []);
});

test("parseLabels returns [] when JSON is not an array", () => {
  assert.deepEqual(parseLabels('{"a":1}'), []);
  assert.deepEqual(parseLabels('"single"'), []);
});

test("serializeLabels round-trips with parseLabels", () => {
  const labels = ["frontend", "p1", "needs-review"];
  assert.deepEqual(parseLabels(serializeLabels(labels)), labels);
});

test("serializeLabels coerces undefined/non-array to []", () => {
  assert.equal(serializeLabels(undefined), "[]");
  // @ts-expect-error testing runtime guard against bad input
  assert.equal(serializeLabels("nope"), "[]");
});
