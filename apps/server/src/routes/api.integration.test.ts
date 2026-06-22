import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";

// A throwaway SQLite database for this test run. Set BEFORE importing anything
// that constructs the Prisma client (dotenv won't override an existing value).
const tmpDir = mkdtempSync(join(tmpdir(), "syncboard-test-"));
const dbFile = join(tmpDir, "test.db");
process.env.DATABASE_URL = `file:${dbFile}`;
process.env.JWT_SECRET = "test-secret";
process.env.AI_PROVIDER = "heuristic";

let server: Server;
let baseUrl: string;
let prisma: { $disconnect: () => Promise<void> };

async function api(
  path: string,
  opts: { method?: string; token?: string; body?: unknown } = {}
) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { status: res.status, body: json as any };
}

before(async () => {
  // Create the schema in the throwaway database.
  execFileSync(
    "npx",
    ["--no-install", "prisma", "db", "push", "--skip-generate", "--schema", "prisma/schema.prisma"],
    { env: process.env, stdio: "ignore" }
  );

  const { createApp } = await import("../app.js");
  ({ prisma } = (await import("../prisma.js")) as any);

  await new Promise<void>((resolve) => {
    server = createApp().listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await prisma?.$disconnect();
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  rmSync(tmpDir, { recursive: true, force: true });
});

// Shared fixtures populated as the suite runs.
const ctx: {
  token?: string;
  userId?: string;
  otherToken?: string;
  projectId?: string;
  todoColumnId?: string;
  taskId?: string;
} = {};

test("register + login issues a token", async () => {
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: { email: "alice@example.com", name: "Alice", password: "password123" },
  });
  assert.equal(reg.status, 201);
  assert.ok(reg.body.token);
  ctx.token = reg.body.token;
  ctx.userId = reg.body.user.id;

  const other = await api("/api/auth/register", {
    method: "POST",
    body: { email: "bob@example.com", name: "Bob", password: "password123" },
  });
  assert.equal(other.status, 201);
  ctx.otherToken = other.body.token;
});

test("create a project and read its default columns", async () => {
  const created = await api("/api/projects", {
    method: "POST",
    token: ctx.token,
    body: { name: "Test Project" },
  });
  assert.equal(created.status, 201);
  const board = created.body.board;
  ctx.projectId = board.project.id;
  assert.equal(board.columns.length, 5);
  const todo = board.columns.find((c: any) => c.name === "To Do");
  assert.ok(todo, "expected a To Do column");
  ctx.todoColumnId = todo.id;
});

test("create a task with labels and read them back as an array", async () => {
  const created = await api(`/api/projects/${ctx.projectId}/tasks`, {
    method: "POST",
    token: ctx.token,
    body: {
      columnId: ctx.todoColumnId,
      title: "Wire up search",
      description: "Add a debounced board search box",
      assigneeId: ctx.userId,
      labels: ["frontend", "p1"],
    },
  });
  assert.equal(created.status, 201);
  ctx.taskId = created.body.task.id;

  // Board state should expose labels as a parsed string array.
  const taskOnBoard = created.body.board.columns
    .flatMap((c: any) => c.tasks)
    .find((t: any) => t.id === ctx.taskId);
  assert.deepEqual(taskOnBoard.labels, ["frontend", "p1"]);
});

test("update task labels", async () => {
  const updated = await api(`/api/tasks/${ctx.taskId}`, {
    method: "PATCH",
    token: ctx.token,
    body: { labels: ["frontend", "p1", "needs-review"] },
  });
  assert.equal(updated.status, 200);
  const taskOnBoard = updated.body.board.columns
    .flatMap((c: any) => c.tasks)
    .find((t: any) => t.id === ctx.taskId);
  assert.deepEqual(taskOnBoard.labels, ["frontend", "p1", "needs-review"]);
});

test("rejects more than 20 labels", async () => {
  const bad = await api(`/api/tasks/${ctx.taskId}`, {
    method: "PATCH",
    token: ctx.token,
    body: { labels: Array.from({ length: 21 }, (_, i) => `l${i}`) },
  });
  assert.equal(bad.status, 400);
});

test("search finds tasks by title and by label", async () => {
  const byTitle = await api(
    `/api/projects/${ctx.projectId}/tasks/search?q=${encodeURIComponent("search")}`,
    { token: ctx.token }
  );
  assert.equal(byTitle.status, 200);
  assert.ok(byTitle.body.results.some((r: any) => r.id === ctx.taskId));

  const byLabel = await api(
    `/api/projects/${ctx.projectId}/tasks/search?q=${encodeURIComponent("needs-review")}`,
    { token: ctx.token }
  );
  assert.ok(byLabel.body.results.some((r: any) => r.id === ctx.taskId));

  const empty = await api(`/api/projects/${ctx.projectId}/tasks/search?q=`, {
    token: ctx.token,
  });
  assert.deepEqual(empty.body.results, []);
});

test("assigned-to-me lists the user's open tasks", async () => {
  const mine = await api("/api/me/tasks", { token: ctx.token });
  assert.equal(mine.status, 200);
  assert.ok(mine.body.tasks.some((t: any) => t.id === ctx.taskId));

  // Bob has nothing assigned.
  const bobs = await api("/api/me/tasks", { token: ctx.otherToken });
  assert.deepEqual(bobs.body.tasks, []);
});

let commentId: string;

test("add and list comments on a task", async () => {
  const added = await api(`/api/tasks/${ctx.taskId}/comments`, {
    method: "POST",
    token: ctx.token,
    body: { body: "Looks good, shipping it." },
  });
  assert.equal(added.status, 201);
  commentId = added.body.comment.id;
  assert.equal(added.body.comment.body, "Looks good, shipping it.");
  assert.equal(added.body.comment.user.id, ctx.userId);

  const listed = await api(`/api/tasks/${ctx.taskId}/comments`, { token: ctx.token });
  assert.equal(listed.status, 200);
  assert.equal(listed.body.comments.length, 1);
  assert.equal(listed.body.comments[0].id, commentId);
});

test("empty comment body is rejected", async () => {
  const bad = await api(`/api/tasks/${ctx.taskId}/comments`, {
    method: "POST",
    token: ctx.token,
    body: { body: "" },
  });
  assert.equal(bad.status, 400);
});

test("a non-member cannot read or comment on the task", async () => {
  const read = await api(`/api/tasks/${ctx.taskId}/comments`, { token: ctx.otherToken });
  assert.equal(read.status, 403);
});

test("only the author can delete their comment", async () => {
  const forbidden = await api(`/api/comments/${commentId}`, {
    method: "DELETE",
    token: ctx.otherToken,
  });
  assert.equal(forbidden.status, 403);

  const ok = await api(`/api/comments/${commentId}`, {
    method: "DELETE",
    token: ctx.token,
  });
  assert.equal(ok.status, 200);

  const listed = await api(`/api/tasks/${ctx.taskId}/comments`, { token: ctx.token });
  assert.deepEqual(listed.body.comments, []);
});

test("requests without a token are rejected", async () => {
  const res = await api("/api/me/tasks");
  assert.equal(res.status, 401);
});
