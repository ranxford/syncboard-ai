import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";

const DEMO_USERS = [
  { email: "ada@syncboard.dev", name: "Ada Lovelace", avatarColor: "#2a9d8f" },
  { email: "grace@syncboard.dev", name: "Grace Hopper", avatarColor: "#b91c1c" },
  { email: "linus@syncboard.dev", name: "Linus T.", avatarColor: "#0e7490" },
] as const;

/** Ensure demo login accounts exist on hosted instances (no wipe — create-if-missing only). */
export async function ensureDemoUsers(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const passwordHash = await bcrypt.hash("password123", 10);
  const verified = new Date();

  for (const demo of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: demo.email } });
    if (existing) continue;

    await prisma.user.create({
      data: {
        email: demo.email,
        name: demo.name,
        passwordHash,
        avatarColor: demo.avatarColor,
        emailVerifiedAt: verified,
      },
    });
    console.log(`[bootstrap] Created demo user ${demo.email}`);
  }
}
