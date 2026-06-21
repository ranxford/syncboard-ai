import OpenAI from "openai";
import { env } from "../env.js";
import { HeuristicProvider } from "./heuristic.js";
import type { MeetingResult } from "./types.js";

/**
 * OpenAI-backed provider. Board analytics reuse the deterministic heuristic
 * engine (structured + explainable), while meeting intelligence uses an LLM.
 * This keeps predictions reliable and only pays for tokens where free-text
 * understanding genuinely helps.
 */
export class OpenAIProvider extends HeuristicProvider {
  private client: OpenAI;

  constructor() {
    super();
    this.client = new OpenAI({ apiKey: env.ai.openaiApiKey });
  }

  override async summarizeMeeting(transcript: string): Promise<MeetingResult> {
    if (!env.ai.openaiApiKey) {
      return super.summarizeMeeting(transcript);
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: env.ai.openaiModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a meeting assistant for a project management tool. " +
              "Given a meeting transcript, return STRICT JSON with keys: " +
              '"summary" (string), "decisions" (string[]), and "actionItems" ' +
              "(array of objects with: title string, priority one of " +
              '"low"|"medium"|"high"|"urgent", and optional assigneeHint string). ' +
              "Action items should be concrete, task-like sentences.",
          },
          { role: "user", content: transcript.slice(0, 12000) },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as Partial<MeetingResult>;
      return {
        summary: parsed.summary ?? "",
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      };
    } catch (err) {
      console.error("[ai] OpenAI summarizeMeeting failed, falling back to heuristic:", err);
      return super.summarizeMeeting(transcript);
    }
  }
}
