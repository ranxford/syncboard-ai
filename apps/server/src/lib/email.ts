import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Resend } from "resend";
import { env } from "../env.js";

let smtpTransporter: Transporter | null = null;
let resendClient: Resend | null = null;

function getSmtpTransporter(): Transporter | null {
  if (!env.email.smtp.enabled) return null;
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: env.email.smtp.host,
      port: env.email.smtp.port,
      secure: env.email.smtp.secure,
      auth: {
        user: env.email.smtp.user,
        pass: env.email.smtp.pass,
      },
    });
  }
  return smtpTransporter;
}

function getResend(): Resend | null {
  if (!env.email.resendApiKey) return null;
  if (!resendClient) resendClient = new Resend(env.email.resendApiKey);
  return resendClient;
}

function verificationContent(name: string, email: string, token: string) {
  const verifyUrl = `${env.webOrigin}/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  const subject = "Confirm your SyncBoard account";
  const text = [
    `Hi ${name},`,
    "",
    "Thanks for signing up for SyncBoard. Confirm your email to start using your workspace.",
    "",
    `Confirm link: ${verifyUrl}`,
    "",
    `Or paste this code on the sign-in page: ${token}`,
    "",
    "This link expires in 24 hours. If you didn't create an account, you can ignore this email.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:system-ui,-apple-system,sans-serif;color:#e5e7eb">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:32px">
        <tr><td>
          <p style="margin:0 0 8px;font-size:13px;color:#2a9d8f;font-weight:600;letter-spacing:0.04em;text-transform:uppercase">SyncBoard</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#f9fafb">Confirm your email</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#9ca3af">Hi ${escapeHtml(name)}, click the button below to verify <strong style="color:#d1d5db">${escapeHtml(email)}</strong> and finish setting up your account.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#2a9d8f;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px">Confirm email</a>
          <p style="margin:24px 0 8px;font-size:12px;color:#6b7280">Or paste this code on the sign-in page:</p>
          <p style="margin:0 0 24px;font-family:ui-monospace,monospace;font-size:13px;color:#d1d5db;background:#0b0f19;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:10px 12px;word-break:break-all">${escapeHtml(token)}</p>
          <p style="margin:0;font-size:11px;color:#4b5563;line-height:1.5">Link expires in 24 hours. If you didn't sign up, ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super(
      "Email service not configured. Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS in apps/server/.env",
    );
    this.name = "EmailNotConfiguredError";
  }
}

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

async function sendViaResend(to: string, subject: string, html: string, text: string) {
  const resend = getResend();
  if (!resend) throw new EmailNotConfiguredError();

  const { error } = await resend.emails.send({
    from: env.email.from,
    to,
    subject,
    html,
    text,
  });
  if (error) {
    const msg =
      error.message === "API key is invalid"
        ? "Invalid RESEND_API_KEY — create a new key at resend.com → API Keys and update apps/server/.env"
        : error.message;
    throw new EmailDeliveryError(msg);
  }
}

async function sendViaSmtp(to: string, subject: string, html: string, text: string) {
  const transport = getSmtpTransporter();
  if (!transport) throw new EmailNotConfiguredError();

  await transport.sendMail({
    from: env.email.from,
    to,
    subject,
    text,
    html,
  });
}

/** Send email verification message. Requires Resend or SMTP to be configured. */
export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  token: string;
}): Promise<void> {
  if (!env.email.enabled) {
    throw new EmailNotConfiguredError();
  }

  const { subject, text, html } = verificationContent(params.name, params.to, params.token);

  if (env.email.provider === "resend") {
    await sendViaResend(params.to, subject, html, text);
  } else {
    await sendViaSmtp(params.to, subject, html, text);
  }

  console.log(`[email] Verification sent to ${params.to} via ${env.email.provider}`);
}

function projectInviteContent(params: {
  projectName: string;
  inviterName: string;
  signupUrl: string;
}) {
  const subject = `You're invited to “${params.projectName}” on SyncBoard`;
  const text = [
    `${params.inviterName} invited you to collaborate on “${params.projectName}”.`,
    "",
    `Create your account with this email address to join automatically:`,
    params.signupUrl,
    "",
    "If you already have an account, sign in with the same email and the project will appear on your dashboard.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:system-ui,-apple-system,sans-serif;color:#e5e7eb">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:32px">
        <tr><td>
          <p style="margin:0 0 8px;font-size:13px;color:#2a9d8f;font-weight:600;letter-spacing:0.04em;text-transform:uppercase">SyncBoard</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#f9fafb">Project invite</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#9ca3af"><strong style="color:#d1d5db">${escapeHtml(params.inviterName)}</strong> invited you to <strong style="color:#d1d5db">${escapeHtml(params.projectName)}</strong>. Sign up with this email to join automatically.</p>
          <a href="${params.signupUrl}" style="display:inline-block;background:#2a9d8f;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px">Join SyncBoard</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

/** Invite someone without an account yet. Best-effort — failures are logged, not thrown. */
export async function sendProjectInviteEmail(params: {
  to: string;
  projectName: string;
  inviterName: string;
}): Promise<boolean> {
  if (!env.email.enabled) return false;

  const signupUrl = `${env.webOrigin}/signup`;
  const { subject, text, html } = projectInviteContent({
    projectName: params.projectName,
    inviterName: params.inviterName,
    signupUrl,
  });

  try {
    if (env.email.provider === "resend") {
      await sendViaResend(params.to, subject, html, text);
    } else {
      await sendViaSmtp(params.to, subject, html, text);
    }
    console.log(`[email] Project invite sent to ${params.to} via ${env.email.provider}`);
    return true;
  } catch (err) {
    console.warn(`[email] Project invite to ${params.to} failed:`, err instanceof Error ? err.message : err);
    return false;
  }
}

/** Verify email transport at startup (non-fatal). */
export async function verifyEmailTransport(): Promise<boolean> {
  if (!env.email.enabled) return false;

  if (env.email.provider === "smtp") {
    const transport = getSmtpTransporter();
    if (!transport) return false;
    try {
      await transport.verify();
      console.log("[email] SMTP connection verified");
      return true;
    } catch (err) {
      console.error("[email] SMTP verification failed:", err);
      return false;
    }
  }

  // Resend has no verify endpoint — a configured API key is enough.
  console.log("[email] Resend API key configured");
  return true;
}
