/**
 * Capture documentation screenshots from a running dev server (localhost:3000).
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

const FILES = {
  landing: "01-landing.png",
  login: "05-login.png",
  dashboard: "02-dashboard.png",
  board: "03-board.png",
  aiInsights: "04-ai-insights.png",
  syncroomLobby: "06-syncroom-lobby.png",
  syncroomSession: "07-syncroom-session.png",
  taskModal: "08-task-syncroom.png",
  teamPanel: "09-team-panel.png",
  sourcePage: "10-source-browser.png",
};

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Use demo account" }).click();
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["camera", "microphone"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT, FILES.landing), fullPage: true });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT, FILES.login), fullPage: false });

  await login(page);
  await page.screenshot({ path: path.join(OUT, FILES.dashboard), fullPage: false });

  await page.goto(`${BASE}/board/${BOARD_ID}`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Backlog", { timeout: 15000 });

  const syncRoomBtn = page.getByRole("button", { name: /SyncRoom/i }).first();
  await syncRoomBtn.click();
  await page.waitForSelector("text=Join SyncRoom", { timeout: 10000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, FILES.syncroomLobby), fullPage: false });

  const joinVideo = page.getByRole("button", { name: /Enter SyncRoom with video/i });
  if (await joinVideo.isVisible()) {
    await joinVideo.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, FILES.syncroomSession), fullPage: false });
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  const firstCard = page.locator("[data-task-id]").first();
  if (await firstCard.count()) {
    await firstCard.click();
    await page.waitForSelector("text=Live discussion", { timeout: 8000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, FILES.taskModal), fullPage: false });
    await page.keyboard.press("Escape");
  }

  await page.screenshot({ path: path.join(OUT, FILES.board), fullPage: false });

  await page.goto(`${BASE}/board/${BOARD_ID}?insights=1`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=AI Insights", { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, FILES.aiInsights), fullPage: false });

  await page.goto(`${BASE}/board/${BOARD_ID}`, { waitUntil: "networkidle" });
  const teamBtn = page.getByRole("button", { name: /Team/i }).first();
  if (await teamBtn.isVisible()) {
    await teamBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, FILES.teamPanel), fullPage: false });
    await page.keyboard.press("Escape");
  }

  await page.goto(`${BASE}/source`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, FILES.sourcePage), fullPage: true });

  await browser.close();
  console.log(`Saved screenshots to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
