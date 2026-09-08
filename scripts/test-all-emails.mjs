#!/usr/bin/env node
/** Send one test for each email type — run: node scripts/test-all-emails.mjs [to@email.com] */
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
config({ path: join(ROOT, "apps/server/.env") });

const to = process.argv[2] ?? "marlinkarp@hotmail.com";
const boardUrl = (process.env.WEB_ORIGIN ?? "http://localhost:3000") + "/board/demo-project";

const {
  sendProjectInviteEmail,
  sendProjectAddedEmail,
  sendSyncRoomStartedEmail,
  sendSyncRoomRecapEmail,
  sendVerificationEmail,
} = await import(join(ROOT, "apps/server/src/lib/email.ts"));

const tests = [
  {
    name: "Verification",
    run: () =>
      sendVerificationEmail({ to, name: "Test User", token: "123456" }).then(() => true),
  },
  {
    name: "Project invite (new user)",
    run: () =>
      sendProjectInviteEmail({
        to,
        projectName: "SyncBoard Demo Project",
        inviterName: "Ada Lovelace",
      }),
  },
  {
    name: "Project added (existing user)",
    run: () =>
      sendProjectAddedEmail({
        to,
        recipientName: "Test User",
        projectName: "SyncBoard Demo Project",
        inviterName: "Ada Lovelace",
        boardUrl,
      }),
  },
  {
    name: "SyncRoom started",
    run: () =>
      sendSyncRoomStartedEmail({
        to,
        recipientName: "Test User",
        projectName: "SyncBoard Demo Project",
        starterName: "Grace Hopper",
        taskTitle: "API integration",
        boardUrl,
      }),
  },
  {
    name: "SyncRoom AI recap",
    run: () =>
      sendSyncRoomRecapEmail({
        to,
        recipientName: "Test User",
        projectName: "SyncBoard Demo Project",
        taskTitle: "API integration",
        summary: "Team agreed to wire SendGrid for production email and verify all alert types.",
        notes: "Session notes from wrap-up panel.",
        decisions: ["Use SendGrid on Render", "Keep marlinkarp@hotmail.com as sender"],
        boardUrl,
        durationMinutes: 12,
      }),
  },
];

console.log(`Testing ${tests.length} email types → ${to}\n`);
let passed = 0;
for (const t of tests) {
  try {
    const ok = await t.run();
    if (ok === false) {
      console.log(`✗ ${t.name} — returned false`);
    } else {
      console.log(`✓ ${t.name}`);
      passed++;
    }
  } catch (err) {
    console.log(`✗ ${t.name} — ${err instanceof Error ? err.message : err}`);
  }
}
console.log(`\n${passed}/${tests.length} sent successfully`);
process.exit(passed === tests.length ? 0 : 1);
