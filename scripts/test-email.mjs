/** Quick email config check — run: node scripts/test-email.mjs [recipient@email.com] */
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
config({ path: join(ROOT, "apps/server/.env") });

const resendKey = (process.env.RESEND_API_KEY ?? "").trim();
const sendgridKey = (process.env.SENDGRID_API_KEY ?? "").trim();
const smtpHost = (process.env.SMTP_HOST ?? "").trim();
const smtpUser = (process.env.SMTP_USER ?? "").trim();
const smtpPass = (process.env.SMTP_PASS ?? "").trim();
const pref = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
const from = process.env.EMAIL_FROM ?? "SyncBoard <noreply@syncboard.dev>";

const smtpEnabled = Boolean(smtpHost && smtpUser && smtpPass);
const provider =
  pref === "sendgrid" && sendgridKey
    ? "sendgrid"
    : pref === "smtp" && smtpEnabled
      ? "smtp"
      : pref === "resend" && resendKey
        ? "resend"
        : smtpEnabled
          ? "smtp"
          : sendgridKey
            ? "sendgrid"
            : resendKey
              ? "resend"
              : null;

if (!provider) {
  console.error(
    "FAIL: No email provider configured.\n" +
      "  Local:  EMAIL_PROVIDER=smtp + Gmail SMTP vars\n" +
      "  Render: EMAIL_PROVIDER=sendgrid + SENDGRID_API_KEY\n" +
      "  Alt:    RESEND_API_KEY",
  );
  process.exit(1);
}

console.log("OK: provider =", provider, "| from =", from);

const to = process.argv[2];
if (!to) {
  console.log("Usage: node scripts/test-email.mjs you@email.com");
  process.exit(0);
}

const subject = "SyncBoard email test";
const text = "If you received this, SyncRoom alerts and invites will work.";

function parseFrom(raw) {
  const match = raw.match(/^(.*?)<([^>]+)>$/);
  if (match) return { name: match[1].trim() || "SyncBoard", email: match[2].trim() };
  return { name: "SyncBoard", email: raw.trim() };
}

if (provider === "sendgrid") {
  const sender = parseFrom(from);
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendgridKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: sender,
      subject,
      content: [{ type: "text/plain", value: text }],
    }),
  });
  if (!res.ok) {
    console.error("FAIL: SendGrid", res.status, (await res.text()).slice(0, 300));
    process.exit(1);
  }
  console.log("OK: test email sent via SendGrid");
} else if (provider === "smtp") {
  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: process.env.SMTP_SECURE !== "true",
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
  });
  try {
    await transport.verify();
    console.log("OK: Nodemailer SMTP verified");
  } catch (err) {
    console.error("FAIL: SMTP verify:", err.message);
    process.exit(1);
  }
  await transport.sendMail({ from, to, subject, text });
  console.log("OK: test email sent via Nodemailer SMTP");
} else {
  if (resendKey.length < 30) {
    console.error("FAIL: RESEND_API_KEY looks truncated");
    process.exit(1);
  }
  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);
  const { data, error } = await resend.emails.send({ from, to, subject, text });
  if (error) {
    console.error("FAIL:", error.message);
    process.exit(1);
  }
  console.log("OK: test email sent via Resend, id =", data?.id);
}
