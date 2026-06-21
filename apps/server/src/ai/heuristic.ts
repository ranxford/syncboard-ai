import { nanoid } from "nanoid";
import type {
  AiBoard,
  AiColumn,
  AiTask,
  AnalyticsResult,
  Insight,
  MeetingResult,
  ActionItem,
  RebalanceSuggestion,
  WorkloadEntry,
  AiProvider,
} from "./types.js";

const DAY_MS = 1000 * 60 * 60 * 24;
const STAGNATION_DAYS = 3;
const DEADLINE_SOON_DAYS = 2;

const PRIORITY_WEIGHT: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 5,
};

function isDoneColumn(col: AiColumn, allColumns: AiColumn[]): boolean {
  if (/done|complete|shipped|closed|resolved/i.test(col.name)) return true;
  const maxOrder = Math.max(...allColumns.map((c) => c.order));
  return col.order === maxOrder && allColumns.length > 1;
}

function isBacklogColumn(col: AiColumn): boolean {
  return /backlog|todo|to do|ideas/i.test(col.name);
}

/**
 * Deterministic, explainable analytics — no external calls.
 * Provides a clean, swap-in baseline for the OpenAI-backed engine.
 */
export class HeuristicProvider implements AiProvider {
  async analyzeBoard(board: AiBoard): Promise<AnalyticsResult> {
    const now = Date.now();
    const columns = board.columns;
    const allTasks: AiTask[] = columns.flatMap((c) => c.tasks);

    const doneColumnIds = new Set(
      columns.filter((c) => isDoneColumn(c, columns)).map((c) => c.id),
    );
    const taskColumn = new Map<string, AiColumn>();
    for (const c of columns) for (const t of c.tasks) taskColumn.set(t.id, c);

    const completed = allTasks.filter(
      (t) => t.completedAt || doneColumnIds.has(taskColumn.get(t.id)!.id),
    );
    const open = allTasks.filter((t) => !completed.includes(t));

    const insights: Insight[] = [];

    // ── Stagnation: tasks sitting too long in a working column ──────────────
    const stagnant = open.filter((t) => {
      const col = taskColumn.get(t.id)!;
      if (isBacklogColumn(col)) return false;
      const days = (now - new Date(t.enteredColumnAt).getTime()) / DAY_MS;
      return days >= STAGNATION_DAYS;
    });
    for (const t of stagnant) {
      const col = taskColumn.get(t.id)!;
      const days = Math.floor((now - new Date(t.enteredColumnAt).getTime()) / DAY_MS);
      insights.push({
        id: nanoid(8),
        type: "stagnation",
        severity: days >= STAGNATION_DAYS * 2 ? "critical" : "warning",
        title: `Task stalled in "${col.name}"`,
        detail: `"${t.title}" has not moved in ${days} day${days === 1 ? "" : "s"}.`,
        recommendation:
          "Check for a blocker, break the task down, or reassign to unblock progress.",
        taskIds: [t.id],
        userId: t.assigneeId ?? undefined,
      });
    }

    // ── Deadline risk: overdue or due very soon, not yet done ───────────────
    for (const t of open) {
      if (!t.dueDate) continue;
      const due = new Date(t.dueDate).getTime();
      const daysToDue = (due - now) / DAY_MS;
      if (daysToDue < 0) {
        insights.push({
          id: nanoid(8),
          type: "deadline_risk",
          severity: "critical",
          title: "Overdue task",
          detail: `"${t.title}" was due ${Math.abs(Math.floor(daysToDue))} day(s) ago.`,
          recommendation: "Re-scope the deadline or prioritize completion immediately.",
          taskIds: [t.id],
          userId: t.assigneeId ?? undefined,
        });
      } else if (daysToDue <= DEADLINE_SOON_DAYS) {
        insights.push({
          id: nanoid(8),
          type: "deadline_risk",
          severity: "warning",
          title: "Deadline approaching",
          detail: `"${t.title}" is due in ${Math.ceil(daysToDue)} day(s).`,
          recommendation: "Confirm the task is on track or escalate early.",
          taskIds: [t.id],
          userId: t.assigneeId ?? undefined,
        });
      }
    }

    // ── WIP limit breaches ──────────────────────────────────────────────────
    for (const col of columns) {
      if (col.wipLimit && col.tasks.length > col.wipLimit) {
        insights.push({
          id: nanoid(8),
          type: "wip_limit",
          severity: "warning",
          title: `"${col.name}" over WIP limit`,
          detail: `${col.tasks.length} tasks exceed the limit of ${col.wipLimit}.`,
          recommendation:
            "Too much work in progress slows delivery. Finish in-flight tasks before pulling new ones.",
          taskIds: col.tasks.map((t) => t.id),
        });
      }
    }

    // ── Workload analysis + rebalancing ─────────────────────────────────────
    const workload = this.computeWorkload(board, open, taskColumn, doneColumnIds);
    const rebalance = this.computeRebalance(board, open, workload, doneColumnIds, taskColumn);

    const overloaded = workload.filter((w) => w.loadScore >= 0.75 && w.openTasks >= 3);
    for (const w of overloaded) {
      insights.push({
        id: nanoid(8),
        type: "workload",
        severity: w.loadScore >= 0.9 ? "critical" : "warning",
        title: `${w.name} may be overloaded`,
        detail: `${w.openTasks} open tasks (~${w.estimateHours}h), well above the team average.`,
        recommendation: "Consider redistributing tasks (see suggestions) to balance the load.",
        userId: w.userId,
      });
    }

    // ── Throughput insight ──────────────────────────────────────────────────
    const recentlyCompleted = completed.filter(
      (t) => t.completedAt && now - new Date(t.completedAt).getTime() <= 7 * DAY_MS,
    );
    if (allTasks.length > 0) {
      insights.push({
        id: nanoid(8),
        type: "throughput",
        severity: "info",
        title: "Weekly throughput",
        detail: `${recentlyCompleted.length} task(s) completed in the last 7 days.`,
        recommendation:
          recentlyCompleted.length === 0
            ? "No completions this week — review priorities and unblock stalled work."
            : "Maintain momentum and keep WIP focused.",
      });
    }

    const metrics = this.computeMetrics(allTasks, completed, open, now);

    // sort: critical first
    const sev = { critical: 0, warning: 1, info: 2 } as const;
    insights.sort((a, b) => sev[a.severity] - sev[b.severity]);

    return {
      generatedAt: new Date().toISOString(),
      metrics,
      insights,
      workload,
      rebalance,
    };
  }

  private computeWorkload(
    board: AiBoard,
    open: AiTask[],
    taskColumn: Map<string, AiColumn>,
    doneColumnIds: Set<string>,
  ): WorkloadEntry[] {
    const scoreByUser = new Map<string, { tasks: number; hours: number; weighted: number }>();
    for (const m of board.members) scoreByUser.set(m.id, { tasks: 0, hours: 0, weighted: 0 });

    for (const t of open) {
      if (!t.assigneeId) continue;
      const col = taskColumn.get(t.id)!;
      if (doneColumnIds.has(col.id)) continue;
      const entry = scoreByUser.get(t.assigneeId);
      if (!entry) continue;
      entry.tasks += 1;
      entry.hours += t.estimateHours ?? 4; // default estimate
      entry.weighted += PRIORITY_WEIGHT[t.priority] ?? 2;
    }

    const maxWeighted = Math.max(1, ...[...scoreByUser.values()].map((e) => e.weighted));

    return board.members
      .map((m) => {
        const e = scoreByUser.get(m.id)!;
        return {
          userId: m.id,
          name: m.name,
          avatarColor: m.avatarColor,
          openTasks: e.tasks,
          estimateHours: Math.round(e.hours * 10) / 10,
          loadScore: Math.round((e.weighted / maxWeighted) * 100) / 100,
        };
      })
      .sort((a, b) => b.loadScore - a.loadScore);
  }

  private computeRebalance(
    board: AiBoard,
    open: AiTask[],
    workload: WorkloadEntry[],
    doneColumnIds: Set<string>,
    taskColumn: Map<string, AiColumn>,
  ): RebalanceSuggestion[] {
    if (workload.length < 2) return [];
    const suggestions: RebalanceSuggestion[] = [];
    const sorted = [...workload].sort((a, b) => b.loadScore - a.loadScore);
    const busiest = sorted[0];
    const lightest = sorted[sorted.length - 1];

    if (busiest.loadScore - lightest.loadScore < 0.4) return [];

    // pick movable tasks from busiest user (lower priority, not started/done)
    const movable = open
      .filter((t) => t.assigneeId === busiest.userId)
      .filter((t) => !doneColumnIds.has(taskColumn.get(t.id)!.id))
      .sort((a, b) => (PRIORITY_WEIGHT[a.priority] ?? 2) - (PRIORITY_WEIGHT[b.priority] ?? 2));

    const memberById = new Map(board.members.map((m) => [m.id, m]));
    for (const t of movable.slice(0, 2)) {
      suggestions.push({
        taskId: t.id,
        taskTitle: t.title,
        fromUserId: busiest.userId,
        fromName: memberById.get(busiest.userId)?.name ?? "Unassigned",
        toUserId: lightest.userId,
        toName: lightest.name,
        reason: `${busiest.name} is at ${Math.round(busiest.loadScore * 100)}% relative load vs ${lightest.name} at ${Math.round(lightest.loadScore * 100)}%.`,
      });
    }
    return suggestions;
  }

  private computeMetrics(all: AiTask[], completed: AiTask[], open: AiTask[], now: number) {
    const overdue = open.filter(
      (t) => t.dueDate && new Date(t.dueDate).getTime() < now,
    ).length;

    const cycleTimes = completed
      .filter((t) => t.completedAt)
      .map((t) => (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60));
    const avgCycleTimeHours =
      cycleTimes.length > 0
        ? Math.round((cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) * 10) / 10
        : null;

    return {
      totalTasks: all.length,
      completedTasks: completed.length,
      inProgressTasks: open.length,
      overdueTasks: overdue,
      completionRate: all.length ? Math.round((completed.length / all.length) * 100) / 100 : 0,
      avgCycleTimeHours,
    };
  }

  async summarizeMeeting(transcript: string): Promise<MeetingResult> {
    // Split on line breaks AND sentence boundaries so both bulleted notes and
    // free-flowing paragraphs are segmented into individual statements.
    const lines = transcript
      .split(/\r?\n/)
      .flatMap((l) => l.split(/(?<=[.!?])\s+/))
      .map((l) => l.trim())
      .filter(Boolean);

    const decisions: string[] = [];
    const actionItems: ActionItem[] = [];
    const actionVerbs = /\b(will|need to|should|must|todo|to-do|action item|let'?s|going to|follow up|create|build|fix|review|send|schedule|investigate|prepare)\b/i;
    const decisionWords = /\b(decided|agreed|conclusion|we'?ll go with|final|approved|chosen)\b/i;
    const assigneeRegex =
      /\b([A-Z][a-z]+)\b\s+(?:will|to|should|is going to|can|owns|needs? to|is responsible|takes?)/;

    for (const line of lines) {
      const clean = line.replace(/^[-*•\d.)\s]+/, "");
      if (!clean) continue;
      if (decisionWords.test(clean)) {
        decisions.push(clean);
        continue;
      }
      if (actionVerbs.test(clean)) {
        const assigneeMatch = clean.match(assigneeRegex);
        const priority: ActionItem["priority"] = /\b(urgent|asap|critical|immediately)\b/i.test(clean)
          ? "urgent"
          : /\b(important|high)\b/i.test(clean)
            ? "high"
            : "medium";
        actionItems.push({
          title: clean.length > 120 ? clean.slice(0, 117) + "…" : clean,
          priority,
          assigneeHint: assigneeMatch?.[1],
        });
      }
    }

    const summaryBase =
      lines.length === 0
        ? "No content provided."
        : `Discussion covered ${lines.length} point(s). ` +
          `${decisions.length} decision(s) and ${actionItems.length} action item(s) were identified.`;

    return {
      summary: summaryBase,
      decisions: decisions.slice(0, 10),
      actionItems: actionItems.slice(0, 15),
    };
  }
}
