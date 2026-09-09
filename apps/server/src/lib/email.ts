import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Resend } from "resend";
import { env } from "../env.js";

let smtpTransporter: Transporter | null = null;
let resendClient: Resend | null = null;

function getSmtpTransporter(): Transporter | null {
  if (!env.email.smtp.enabled) return null;
  if (!smtpTransporter) {
    const port = env.email.smtp.port;
    smtpTransporter = nodemailer.createTransport({
      host: env.email.smtp.host,
      port,
      secure: env.email.smtp.secure,
      requireTLS: !env.email.smtp.secure && port === 587,
      auth: {
        user: env.email.smtp.user,
        pass: env.email.smtp.pass,
      },
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 30_000,
    });
  }
  return smtpTransporter;
}

function parseFromAddress(from: string): { email: string; name: string } {
  const match = from.match(/^(.*?)<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim() || "SyncBoard", email: match[2].trim() };
  }
  return { name: "SyncBoard", email: from.trim() };
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
      "Email service not configured. Set SENDGRID_API_KEY, SMTP_HOST/SMTP_USER/SMTP_PASS (Nodemailer), or RESEND_API_KEY in apps/server/.env",
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

async function sendViaSendGrid(to: string, subject: string, html: string, text: string) {
  if (!env.email.sendgridApiKey) throw new EmailNotConfiguredError();

  const from = parseFromAddress(env.email.from);
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.email.sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from.email, name: from.name },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new EmailDeliveryError(`SendGrid ${res.status}: ${body.slice(0, 240)}`);
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

async function deliverEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  if (env.email.provider === "sendgrid") {
    await sendViaSendGrid(to, subject, html, text);
  } else if (env.email.provider === "resend") {
    await sendViaResend(to, subject, html, text);
  } else {
    await sendViaSmtp(to, subject, html, text);
  }
}

/** Generic transactional email — best-effort, returns false on failure. */
export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  if (!env.email.enabled) return false;
  try {
    await deliverEmail(params.to, params.subject, params.html, params.text);
    console.log(`[email] Sent “${params.subject}” to ${params.to} via ${env.email.provider}`);
    return true;
  } catch (err) {
    console.warn(
      `[email] Failed to send to ${params.to}:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
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

  await deliverEmail(params.to, subject, html, text);

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

  return sendTransactionalEmail({ to: params.to, subject, text, html });
}

/** Tell an existing user they were added to a project. */
export async function sendProjectAddedEmail(params: {
  to: string;
  recipientName: string;
  projectName: string;
  inviterName: string;
  boardUrl: string;
}): Promise<boolean> {
  if (!env.email.enabled) return false;

  const subject = `You were added to “${params.projectName}” on SyncBoard`;
  const text = [
    `Hi ${params.recipientName},`,
    "",
    `${params.inviterName} added you to the project “${params.projectName}”.`,
    "",
    `Open your board: ${params.boardUrl}`,
    "",
    "Sign in with this email — the project is already on your dashboard.",
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
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#f9fafb">Added to project</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#9ca3af"><strong style="color:#d1d5db">${escapeHtml(params.inviterName)}</strong> added you to <strong style="color:#d1d5db">${escapeHtml(params.projectName)}</strong>.</p>
          <a href="${params.boardUrl}" style="display:inline-block;background:#2a9d8f;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px">Open project board</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendTransactionalEmail({ to: params.to, subject, text, html });
}

/** Notify a member that review criteria were assigned for their role. */
export async function sendAlignmentAssignedEmail(params: {
  to: string;
  recipientName: string;
  projectName: string;
  adminName: string;
  positionLabel: string;
  assignedRequirements: string;
  boardUrl: string;
}): Promise<boolean> {
  if (!env.email.enabled) return false;

  const role = params.positionLabel ? ` (${params.positionLabel})` : "";
  const subject = `Review criteria assigned — ${params.projectName}`;
  const criteria = params.assignedRequirements.trim() || "See the Review column on your project board for details.";
  const text = [
    `Hi ${params.recipientName},`,
    "",
    `${params.adminName} assigned review criteria for you${role} on “${params.projectName}”.`,
    "",
    criteria,
    "",
    `Open your board: ${params.boardUrl}`,
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
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#f9fafb">Review criteria assigned</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#9ca3af"><strong style="color:#d1d5db">${escapeHtml(params.adminName)}</strong> set criteria for you${escapeHtml(role)} on <strong style="color:#d1d5db">${escapeHtml(params.projectName)}</strong>.</p>
          <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#d1d5db;background:#0b0f19;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:12px;white-space:pre-wrap">${escapeHtml(criteria)}</p>
          <a href="${params.boardUrl}" style="display:inline-block;background:#2a9d8f;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px">View project board</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendTransactionalEmail({ to: params.to, subject, text, html });
}

function syncRoomEmailShell(title: string, bodyHtml: string, actionUrl: string, actionLabel: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:system-ui,-apple-system,sans-serif;color:#e5e7eb">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:32px">
        <tr><td>
          <p style="margin:0 0 8px;font-size:13px;color:#2a9d8f;font-weight:600;letter-spacing:0.04em;text-transform:uppercase">SyncBoard · SyncRoom</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#f9fafb">${escapeHtml(title)}</h1>
          ${bodyHtml}
          <a href="${actionUrl}" style="display:inline-block;margin-top:24px;background:#2a9d8f;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px">${escapeHtml(actionLabel)}</a>
          <p style="margin:24px 0 0;font-size:11px;color:#4b5563;line-height:1.5">You’re receiving this because you’re on the project team. Open SyncBoard to join live or review notes.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Notify a teammate that a SyncRoom call started (for members not on the web app). */
export async function sendSyncRoomStartedEmail(params: {
  to: string;
  recipientName: string;
  projectName: string;
  starterName: string;
  taskTitle?: string | null;
  boardUrl: string;
}): Promise<boolean> {
  const task = params.taskTitle ? ` on “${params.taskTitle}”` : "";
  const subject = `${params.starterName} started SyncRoom — ${params.projectName}`;
  const text = [
    `Hi ${params.recipientName},`,
    "",
    `${params.starterName} just started a SyncRoom in “${params.projectName}”${task}.`,
    "",
    `Join now: ${params.boardUrl}`,
    "",
    "Teammates already in the app also get an in-app alert.",
  ].join("\n");

  const html = syncRoomEmailShell(
    "SyncRoom is live",
    `<p style="margin:0;font-size:14px;line-height:1.6;color:#9ca3af"><strong style="color:#d1d5db">${escapeHtml(params.starterName)}</strong> started a call in <strong style="color:#d1d5db">${escapeHtml(params.projectName)}</strong>${escapeHtml(task)}. Jump in while the team is online.</p>`,
    params.boardUrl,
    "Join SyncRoom",
  );

  return sendTransactionalEmail({ to: params.to, subject, text, html });
}

/** Recap email after SyncRoom wrap-up with AI summary. */
export async function sendSyncRoomRecapEmail(params: {
  to: string;
  recipientName: string;
  projectName: string;
  taskTitle?: string | null;
  summary?: string | null;
  notes?: string | null;
  decisions?: string[];
  boardUrl: string;
  durationMinutes?: number;
}): Promise<boolean> {
  const task = params.taskTitle ? ` · ${params.taskTitle}` : "";
  const subject = `SyncRoom AI recap — ${params.projectName}${task}`;
  const duration =
    params.durationMinutes && params.durationMinutes > 0
      ? `\nDuration: about ${params.durationMinutes} min\n`
      : "";

  const recapParts: string[] = [];
  if (params.summary?.trim()) recapParts.push(`AI summary:\n${params.summary.trim()}`);
  if (params.decisions?.length) {
    recapParts.push(`Decisions:\n${params.decisions.map((d) => `• ${d}`).join("\n")}`);
  }
  if (params.notes?.trim()) recapParts.push(`Session notes:\n${params.notes.trim()}`);
  const recapBlock = recapParts.length ? `\n\n${recapParts.join("\n\n")}` : "";

  const text = [
    `Hi ${params.recipientName},`,
    "",
    `Your team completed a SyncRoom in “${params.projectName}”.${duration}`,
    recapBlock,
    "",
    `Open the board: ${params.boardUrl}`,
  ].join("\n");

  let recapHtml = "";
  if (params.summary?.trim()) {
    recapHtml += `<p style="margin:16px 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em">AI summary</p><p style="margin:0;font-size:14px;line-height:1.6;color:#d1d5db">${escapeHtml(params.summary.trim())}</p>`;
  }
  if (params.decisions?.length) {
    recapHtml += `<p style="margin:16px 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em">Decisions</p><ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:#9ca3af">${params.decisions.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`;
  }
  if (params.notes?.trim()) {
    recapHtml += `<p style="margin:16px 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em">Session notes</p><p style="margin:0;font-size:14px;line-height:1.6;color:#9ca3af;white-space:pre-wrap">${escapeHtml(params.notes.trim())}</p>`;
  }
  if (!recapHtml) {
    recapHtml = `<p style="margin:0;font-size:14px;line-height:1.6;color:#9ca3af">The session ended. Open the board to review wrap-up details.</p>`;
  }

  const html = syncRoomEmailShell(
    "SyncRoom AI recap",
    `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#9ca3af">Here is the AI-generated recap from your SyncRoom in <strong style="color:#d1d5db">${escapeHtml(params.projectName)}</strong>${params.durationMinutes ? ` (${params.durationMinutes} min)` : ""}.</p>${recapHtml}`,
    params.boardUrl,
    "View project board",
  );

  return sendTransactionalEmail({ to: params.to, subject, text, html });
}

/** Verify email transport at startup (non-fatal). */
export async function verifyEmailTransport(): Promise<boolean> {
  if (!env.email.enabled) return false;

  if (env.email.provider === "smtp" && env.isProd) {
    console.warn(
      "[email] Nodemailer/SMTP is blocked on Render free tier — set EMAIL_PROVIDER=sendgrid for production.",
    );
  }

  if (env.email.provider === "sendgrid") {
    console.log("[email] SendGrid API configured (HTTPS — works on Render free tier)");
    return true;
  }

  if (env.email.provider === "smtp") {
    const transport = getSmtpTransporter();
    if (!transport) return false;
    try {
      await transport.verify();
      console.log("[email] Nodemailer SMTP connection verified");
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
