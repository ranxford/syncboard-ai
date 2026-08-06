import { randomBytes } from "crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { signToken } from "../lib/jwt.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { ensurePersonalTimeline } from "../lib/timelines.js";

export const authRouter = Router();

const AVATAR_COLORS = [
  "#2a9d8f", "#c26a00", "#0284c7", "#059669",
  "#b45309", "#0e7490", "#4b5563", "#b91c1c",
];

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(60),
  password: z.string().min(6).max(200),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const confirmSchema = z.object({
  email: z.string().email(),
  token: z.string().min(8),
});

function publicUser(u: {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  emailVerifiedAt: Date | null;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarColor: u.avatarColor,
    emailVerified: Boolean(u.emailVerifiedAt),
  };
}

function newConfirmToken() {
  return randomBytes(24).toString("hex");
}

function confirmExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

/** Auto-accept pending project invites for this email. */
async function acceptPendingInvites(userId: string, email: string) {
  const invites = await prisma.projectInvite.findMany({
    where: {
      email: email.toLowerCase(),
      status: "pending",
      expiresAt: { gt: new Date() },
    },
  });
  for (const inv of invites) {
    const existing = await prisma.membership.findUnique({
      where: { userId_projectId: { userId, projectId: inv.projectId } },
    });
    if (!existing) {
      await prisma.membership.create({
        data: { userId, projectId: inv.projectId, role: inv.role },
      });
      await ensurePersonalTimeline(inv.projectId, userId);
    }
    await prisma.projectInvite.update({
      where: { id: inv.id },
      data: { status: "accepted" },
    });
  }
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { email, name, password } = parsed.data;
  const normalized = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const skipVerify = process.env.NODE_ENV === "test";
  const token = newConfirmToken();

  const user = await prisma.user.create({
    data: {
      email: normalized,
      name,
      passwordHash,
      avatarColor,
      emailVerifiedAt: skipVerify ? new Date() : null,
      emailConfirmToken: skipVerify ? null : token,
      emailConfirmExpires: skipVerify ? null : confirmExpiry(),
    },
  });

  if (skipVerify) {
    await acceptPendingInvites(user.id, user.email);
    const jwt = signToken({ userId: user.id, email: user.email });
    return res.status(201).json({ token: jwt, user: publicUser(user) });
  }

  console.log(`[auth] Email confirmation for ${user.email}: token=${token}`);

  return res.status(201).json({
    needsVerification: true,
    email: user.email,
    // Demo-friendly: no SMTP — token shown so confirmation can be completed locally
    demoToken: token,
    message: "Check your email to confirm your account. In demo mode the code is shown here.",
  });
});

authRouter.post("/confirm", async (req, res) => {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Email and confirmation token required" });
  }
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.emailConfirmToken) {
    return res.status(400).json({ error: "Invalid or expired confirmation link" });
  }
  if (user.emailConfirmToken !== parsed.data.token) {
    return res.status(400).json({ error: "Invalid confirmation code" });
  }
  if (user.emailConfirmExpires && user.emailConfirmExpires < new Date()) {
    return res.status(400).json({ error: "Confirmation code expired — request a new one" });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailConfirmToken: null,
      emailConfirmExpires: null,
    },
  });

  await acceptPendingInvites(updated.id, updated.email);
  const jwt = signToken({ userId: updated.id, email: updated.email });
  return res.json({ token: jwt, user: publicUser(updated) });
});

authRouter.post("/resend-confirmation", async (req, res) => {
  const email = z.string().email().safeParse(req.body?.email);
  if (!email.success) return res.status(400).json({ error: "Valid email required" });
  const user = await prisma.user.findUnique({ where: { email: email.data.toLowerCase() } });
  if (!user) {
    return res.json({ ok: true, message: "If that account exists, a new code was issued." });
  }
  if (user.emailVerifiedAt) {
    return res.status(400).json({ error: "Email is already confirmed" });
  }
  const token = newConfirmToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { emailConfirmToken: token, emailConfirmExpires: confirmExpiry() },
  });
  console.log(`[auth] Resent confirmation for ${user.email}: token=${token}`);
  return res.json({
    ok: true,
    demoToken: token,
    message: "A new confirmation code was issued (shown in demo mode).",
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (!user.emailVerifiedAt) {
    return res.status(403).json({
      error: "Please confirm your email before signing in",
      needsVerification: true,
      email: user.email,
    });
  }

  await acceptPendingInvites(user.id, user.email);
  const token = signToken({ userId: user.id, email: user.email });
  return res.json({ token, user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user: publicUser(user) });
});
