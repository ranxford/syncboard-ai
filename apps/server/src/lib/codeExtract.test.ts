import { test } from "node:test";
import assert from "node:assert/strict";
import AdmZip from "adm-zip";
import { extractDocxText, extractPdfText, extractTextFromBuffer } from "./codeExtract.js";

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

test("extractDocxText pulls text from word/document.xml", () => {
  const zip = new AdmZip();
  zip.addFile(
    "word/document.xml",
    Buffer.from(
      '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello DOCX</w:t></w:r><w:r><w:t> world</w:t></w:r></w:p></w:body></w:document>',
    ),
  );
  const text = extractDocxText(zip.toBuffer());
  assert.ok(text.includes("Hello DOCX"));
  assert.ok(text.includes("world"));
});

test("extractTextFromBuffer handles DOCX files", () => {
  const zip = new AdmZip();
  zip.addFile(
    "word/document.xml",
    Buffer.from(
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Deliverable write-up</w:t></w:r></w:p></w:body></w:document>',
    ),
  );
  const out = extractTextFromBuffer(
    "report.docx",
    zip.toBuffer(),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  assert.equal(out.length, 1);
  assert.ok(out[0].text.includes("Deliverable write-up"));
});
