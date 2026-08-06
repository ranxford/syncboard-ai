/**
 * Capture README screenshots from a running dev server (localhost:3000).
 * Usage: node scripts/capture-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "docs/screenshots");
const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const BOARD_ID = process.env.SCREENSHOT_BOARD_ID ?? "cmrgf9p5u00040stou822ns1e";

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Use demo account" }).click();
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT, "landing.png"), fullPage: true });

  await login(page);
  await page.screenshot({ path: path.join(OUT, "dashboard.png"), fullPage: false });

  await page.goto(`${BASE}/board/${BOARD_ID}`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Backlog", { timeout: 15000 });
  await page.screenshot({ path: path.join(OUT, "board.png"), fullPage: false });

  await page.getByRole("button", { name: "Tools" }).click();
  await page.getByRole("menuitem", { name: "AI insights" }).click();
  await page.waitForSelector("text=AI Insights", { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "ai-insights.png"), fullPage: false });

  await browser.close();
  console.log(`Saved screenshots to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
