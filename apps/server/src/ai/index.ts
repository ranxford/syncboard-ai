import { env } from "../env.js";
import { HeuristicProvider } from "./heuristic.js";
import { OpenAIProvider } from "./openai.js";
import type { AiProvider } from "./types.js";

function createProvider(): AiProvider {
  if (env.ai.provider === "openai" && env.ai.openaiApiKey) {
    console.log("[ai] using OpenAI provider");
    return new OpenAIProvider();
  }
  if (env.ai.provider === "openai" && !env.ai.openaiApiKey) {
    console.warn("[ai] AI_PROVIDER=openai but OPENAI_API_KEY is empty — using heuristic engine");
  }
  console.log("[ai] using heuristic provider");
  return new HeuristicProvider();
}

export const ai: AiProvider = createProvider();
export * from "./types.js";
