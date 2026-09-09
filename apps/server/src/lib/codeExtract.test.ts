import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPdfText, extractTextFromBuffer } from "./codeExtract.js";

test("extractPdfText pulls text from PDF string objects", () => {
  const fakePdf = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n(Hello PDF world) Tj\n(More content here) Tj\n",
    "latin1",
  );
  const text = extractPdfText(fakePdf);
  assert.ok(text.includes("Hello PDF world"));
  assert.ok(text.includes("More content here"));
});

test("extractTextFromBuffer handles PDF files", () => {
  const fakePdf = Buffer.from("(Deliverable summary text) Tj", "latin1");
  const out = extractTextFromBuffer("report.pdf", fakePdf, "application/pdf");
  assert.equal(out.length, 1);
  assert.ok(out[0].text.includes("Deliverable summary"));
});

test("extractTextFromBuffer includes image metadata", () => {
  const out = extractTextFromBuffer("screenshot.png", Buffer.from([0x89, 0x50]), "image/png");
  assert.equal(out.length, 1);
  assert.ok(out[0].text.includes("Image attachment"));
  assert.ok(out[0].text.includes("screenshot.png"));
});

test("extractTextFromBuffer reads SVG as text", () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><text>Design mock</text></svg>');
  const out = extractTextFromBuffer("mock.svg", svg, "image/svg+xml");
  assert.equal(out.length, 1);
  assert.ok(out[0].text.includes("Design mock"));
});
