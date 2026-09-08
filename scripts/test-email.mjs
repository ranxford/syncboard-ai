/** Quick email config check — run: node scripts/test-email.mjs */
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
config({ path: join(ROOT, "apps/server/.env") });

const key = (process.env.RESEND_API_KEY ?? "").trim();
const from = process.env.EMAIL_FROM ?? "SyncBoard <onboarding@resend.dev>";

if (!key) {
  console.error("FAIL: RESEND_API_KEY is missing or empty in apps/server/.env");
  process.exit(1);
}

if (key.length < 30) {
  console.error("FAIL: RESEND_API_KEY looks truncated — copy the full key from resend.com → API Keys");
  process.exit(1);
}

const { Resend } = await import("resend");
const resend = new Resend(key);
const to = process.argv[2];
if (!to) {
  console.log("OK: API key loaded, from =", from);
  console.log("Usage: node scripts/test-email.mjs you@email.com");
  process.exit(0);
}

const { data, error } = await resend.emails.send({
  from,
  to,
  subject: "SyncBoard email test",
  text: "If you received this, email verification is working.",
});

if (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}
console.log("OK: test email sent, id =", data?.id);
