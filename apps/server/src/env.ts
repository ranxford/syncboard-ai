import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required("JWT_SECRET", "dev-super-secret-change-me"),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  databaseUrl: required("DATABASE_URL", "file:./dev.db"),
  redisUrl: process.env.REDIS_URL || null,
  ai: {
    provider: (process.env.AI_PROVIDER ?? "heuristic") as "heuristic" | "openai",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  },
  email: {
    from:
      process.env.EMAIL_FROM ??
      (process.env.RESEND_API_KEY ? "SyncBoard <onboarding@resend.dev>" : "SyncBoard <noreply@syncboard.dev>"),
    resendApiKey: (process.env.RESEND_API_KEY ?? "").trim(),
    smtp: {
      host: process.env.SMTP_HOST ?? "",
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
      get enabled() {
        return Boolean(this.host && this.user && this.pass);
      },
    },
    get provider(): "resend" | "smtp" | null {
      if (this.resendApiKey) return "resend";
      if (this.smtp.enabled) return "smtp";
      return null;
    },
    get enabled() {
      return this.provider !== null;
    },
  },
  isProd: process.env.NODE_ENV === "production",
};
