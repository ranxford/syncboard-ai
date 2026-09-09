import OpenAI from "openai";
import { env } from "../env.js";
import { HeuristicProvider } from "./heuristic.js";
import type {
  MeetingResult,
  GeneratedMemberTask,
  TaskReviewResult,
  ProjectReviewAnalysis,
  AiMemberContext,
} from "./types.js";

/**
 * DeepSeek-backed provider (OpenAI-compatible API).
 * Board analytics reuse the deterministic heuristic engine; LLM powers
 * meeting summaries, task generation, and the review gate.
 */
export class DeepSeekProvider extends HeuristicProvider {
  private client: OpenAI;

  constructor() {
    super();
    this.client = new OpenAI({
      apiKey: env.ai.deepseekApiKey,
      baseURL: "https://api.deepseek.com",
    });
  }

  override providerName(): string {
    return env.ai.deepseekApiKey ? "deepseek" : "heuristic";
  }

  private async chatJson<T>(system: string, user: string): Promise<T | null> {
    if (!env.ai.deepseekApiKey) return null;
    try {
      const completion = await this.client.chat.completions.create({
        model: env.ai.deepseekModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user.slice(0, 14000) },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error("[ai] DeepSeek call failed, falling back to heuristic:", err);
      return null;
    }
  }

  override async summarizeMeeting(transcript: string): Promise<MeetingResult> {
    if (!env.ai.deepseekApiKey) {
      return super.summarizeMeeting(transcript);
    }

    const parsed = await this.chatJson<Partial<MeetingResult>>(
      "You are a meeting assistant for a project management tool. " +
        'Return STRICT JSON with keys: "summary" (string), "decisions" (string[]), ' +
        'and "actionItems" (array of {title, priority: "low"|"medium"|"high"|"urgent", assigneeHint?}).',
      transcript,
    );
    if (!parsed) return super.summarizeMeeting(transcript);
    return {
      summary: parsed.summary ?? "",
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    };
  }

  override async generateMemberTasks(input: {
    instruction: string;
    projectName: string;
    projectRequirements: string;
    members: AiMemberContext[];
  }): Promise<GeneratedMemberTask[]> {
    const parsed = await this.chatJson<{ tasks?: GeneratedMemberTask[] }>(
      "You are a project admin assistant powered by DeepSeek. " +
        "Given an admin instruction, create one concrete task per team member. " +
        'Return JSON: { "tasks": [{ "assigneeId", "title", "description?", "priority": "low"|"medium"|"high"|"urgent" }] }. ' +
        "Each task must match the member's role and assigned requirements.",
      JSON.stringify({
        instruction: input.instruction,
        project: input.projectName,
        requirements: input.projectRequirements,
        members: input.members,
      }),
    );
    if (!parsed?.tasks?.length) return super.generateMemberTasks(input);

    const validIds = new Set(input.members.map((m) => m.id));
    return parsed.tasks
      .filter((t) => validIds.has(t.assigneeId) && t.title?.trim())
      .map((t) => ({
        assigneeId: t.assigneeId,
        title: t.title.trim().slice(0, 200),
        description: (t.description ?? "").slice(0, 2000),
        priority: (["low", "medium", "high", "urgent"] as const).includes(t.priority)
          ? t.priority
          : "medium",
      }));
  }

  override async reviewTaskWork(input: {
    taskTitle: string;
    taskDescription: string;
    comments: string[];
    projectRequirements: string;
    memberRequirements: string;
    positionLabel: string;
    artifactSummary: string;
    codeExcerpt: string;
  }): Promise<TaskReviewResult> {
    const parsed = await this.chatJson<TaskReviewResult>(
      "You are DeepSeek acting as a strict but fair code/work reviewer for a supervised team project. " +
        "Compare the member's work against admin criteria. " +
        'Return JSON: { "passed": boolean, "feedback": string (2-4 sentences), "score": number 0-100 }. ' +
        "Pass only if work clearly addresses assigned requirements.",
      JSON.stringify(input),
    );
    if (!parsed || typeof parsed.passed !== "boolean") return super.reviewTaskWork(input);
    return {
      passed: parsed.passed,
      feedback: parsed.feedback ?? (parsed.passed ? "Approved." : "Needs revision."),
      score: typeof parsed.score === "number" ? Math.round(parsed.score) : parsed.passed ? 80 : 40,
    };
  }

  override async analyzeProjectReview(input: {
    projectName: string;
    requirements: string;
    reviewTasks: { title: string; assigneeName: string; description: string; reviewStatus: string }[];
    members: AiMemberContext[];
  }): Promise<ProjectReviewAnalysis> {
    const parsed = await this.chatJson<ProjectReviewAnalysis>(
      "You are DeepSeek analyzing project progress for items in the Review column. " +
        'Return JSON: { "summary": string, "blockers": string[], "recommendations": string[] }.',
      JSON.stringify(input),
    );
    if (!parsed?.summary) return super.analyzeProjectReview(input);
    return {
      summary: parsed.summary,
      blockers: Array.isArray(parsed.blockers) ? parsed.blockers : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    };
  }
}
