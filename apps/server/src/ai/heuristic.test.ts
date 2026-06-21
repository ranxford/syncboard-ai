import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HeuristicProvider } from "./heuristic.js";
import type { AiBoard } from "./types.js";

const DAY = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

const provider = new HeuristicProvider();

function board(overrides: Partial<AiBoard> = {}): AiBoard {
  return {
    members: [
      { id: "u1", name: "Ada", avatarColor: "#111" },
      { id: "u2", name: "Grace", avatarColor: "#222" },
    ],
    columns: [
      { id: "c0", name: "Backlog", order: 0, wipLimit: null, tasks: [] },
      { id: "c1", name: "In Progress", order: 1, wipLimit: 2, tasks: [] },
      { id: "c2", name: "Done", order: 2, wipLimit: null, tasks: [] },
    ],
    ...overrides,
  };
}

function task(p: Partial<AiBoard["columns"][number]["tasks"][number]> = {}) {
  return {
    id: Math.random().toString(36).slice(2),
    title: "Task",
    priority: "medium",
    assigneeId: null,
    estimateHours: 4,
    dueDate: null,
    enteredColumnAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    ...p,
  };
}

describe("HeuristicProvider.analyzeBoard", () => {
  it("flags a stalled task in a working column", async () => {
    const b = board();
    b.columns[1].tasks.push(task({ title: "Stuck", enteredColumnAt: daysAgo(6) }));
    const res = await provider.analyzeBoard(b);
    const stagnation = res.insights.filter((i) => i.type === "stagnation");
    assert.equal(stagnation.length, 1);
    assert.match(stagnation[0].detail, /Stuck/);
    assert.equal(stagnation[0].severity, "critical"); // >= 2x threshold
  });

  it("does NOT flag stagnation for backlog items", async () => {
    const b = board();
    b.columns[0].tasks.push(task({ title: "Idea", enteredColumnAt: daysAgo(30) }));
    const res = await provider.analyzeBoard(b);
    assert.equal(res.insights.filter((i) => i.type === "stagnation").length, 0);
  });

  it("flags overdue and approaching deadlines", async () => {
    const b = board();
    b.columns[1].tasks.push(task({ title: "Late", dueDate: daysAgo(2) }));
    b.columns[1].tasks.push(task({ title: "Soon", dueDate: daysFromNow(1) }));
    const res = await provider.analyzeBoard(b);
    const risks = res.insights.filter((i) => i.type === "deadline_risk");
    assert.equal(risks.length, 2);
    assert.ok(risks.some((r) => r.severity === "critical"));
    assert.ok(risks.some((r) => r.severity === "warning"));
  });

  it("flags WIP limit breaches", async () => {
    const b = board();
    b.columns[1].tasks.push(task(), task(), task()); // limit is 2
    const res = await provider.analyzeBoard(b);
    const wip = res.insights.filter((i) => i.type === "wip_limit");
    assert.equal(wip.length, 1);
    assert.match(wip[0].detail, /3 tasks/);
  });

  it("computes workload and suggests rebalancing for an overloaded member", async () => {
    const b = board();
    for (let i = 0; i < 5; i++) {
      b.columns[1].tasks.push(task({ assigneeId: "u1", priority: "high" }));
    }
    b.columns[1].tasks.push(task({ assigneeId: "u2", priority: "low" }));
    const res = await provider.analyzeBoard(b);

    const ada = res.workload.find((w) => w.userId === "u1")!;
    const grace = res.workload.find((w) => w.userId === "u2")!;
    assert.ok(ada.openTasks === 5);
    assert.ok(ada.loadScore > grace.loadScore);
    assert.ok(res.rebalance.length > 0);
    assert.equal(res.rebalance[0].fromUserId, "u1");
    assert.equal(res.rebalance[0].toUserId, "u2");
  });

  it("computes completion metrics", async () => {
    const b = board();
    b.columns[1].tasks.push(task());
    b.columns[2].tasks.push(task({ completedAt: daysAgo(1), createdAt: daysAgo(3) }));
    const res = await provider.analyzeBoard(b);
    assert.equal(res.metrics.totalTasks, 2);
    assert.equal(res.metrics.completedTasks, 1);
    assert.equal(res.metrics.completionRate, 0.5);
    assert.ok(res.metrics.avgCycleTimeHours && res.metrics.avgCycleTimeHours > 0);
  });

  it("reports a healthy board with no critical risks", async () => {
    const b = board();
    b.columns[0].tasks.push(task());
    const res = await provider.analyzeBoard(b);
    assert.equal(res.insights.filter((i) => i.severity === "critical").length, 0);
  });
});

describe("HeuristicProvider.summarizeMeeting", () => {
  it("extracts decisions and action items with priority and assignee from a paragraph", async () => {
    const transcript =
      "Ada will finish the WebSocket feature by Friday. " +
      "We decided to use SQLite for dev. " +
      "Grace needs to review the security audit, it is urgent. " +
      "Linus should prepare the demo deck.";
    const res = await provider.summarizeMeeting(transcript);

    assert.equal(res.decisions.length, 1);
    assert.match(res.decisions[0], /SQLite/);

    assert.equal(res.actionItems.length, 3);
    const urgent = res.actionItems.find((a) => a.priority === "urgent");
    assert.ok(urgent, "should detect urgent priority");
    assert.match(urgent!.title, /security audit/);

    const hints = res.actionItems.map((a) => a.assigneeHint);
    assert.ok(hints.includes("Ada"));
    assert.ok(hints.includes("Grace"));
    assert.ok(hints.includes("Linus"));
  });

  it("handles bulleted notes", async () => {
    const transcript = ["- Build the login page", "- Fix the deploy script"].join("\n");
    const res = await provider.summarizeMeeting(transcript);
    assert.equal(res.actionItems.length, 2);
  });

  it("returns empty results for empty input", async () => {
    const res = await provider.summarizeMeeting("");
    assert.equal(res.actionItems.length, 0);
    assert.equal(res.decisions.length, 0);
  });
});
