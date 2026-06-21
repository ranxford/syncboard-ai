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
  isProd: process.env.NODE_ENV === "production",
};
