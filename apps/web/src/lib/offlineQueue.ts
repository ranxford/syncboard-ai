import { api, ApiError, NetworkError } from "./api";
import type { Board, Priority } from "./types";

/**
 * Connectivity-adaptive sync.
 *
 * Every board mutation is applied optimistically to local state and sent to the
 * server. If the network is unavailable, the operation is persisted to a
 * localStorage-backed queue and replayed (in order) once connectivity returns.
 */

export type QueuedOp =
  | { kind: "create"; tempId: string; projectId: string; columnId: string; data: CreateData }
  | { kind: "update"; taskId: string; data: UpdateData }
  | { kind: "move"; taskId: string; columnId: string; index: number }
  | { kind: "delete"; taskId: string };

interface CreateData {
  title: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string | null;
  estimateHours?: number | null;
  dueDate?: string | null;
}

type UpdateData = Partial<{
  title: string;
  description: string;
  priority: Priority;
  assigneeId: string | null;
  estimateHours: number | null;
  dueDate: string | null;
}>;

const keyFor = (projectId: string) => `syncboard.queue.${projectId}`;

export function loadQueue(projectId: string): QueuedOp[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(keyFor(projectId)) ?? "[]");
  } catch {
    return [];
  }
}

export function saveQueue(projectId: string, ops: QueuedOp[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(keyFor(projectId), JSON.stringify(ops));
}

export function enqueue(projectId: string, op: QueuedOp) {
  const ops = loadQueue(projectId);
  ops.push(op);
  saveQueue(projectId, ops);
}

export interface FlushResult {
  board: Board | null;
  remaining: number;
  stoppedOffline: boolean;
}

/**
 * Replay queued ops in order. Returns the latest server board (if any op
 * succeeded). Stops early and keeps the remaining queue if the network drops.
 * Ops referencing temp ids that never synced, or ids the server rejects, are
 * dropped so the queue can't get permanently stuck.
 */
export async function flushQueue(projectId: string): Promise<FlushResult> {
  let ops = loadQueue(projectId);
  let latestBoard: Board | null = null;
  const tempIdMap = new Map<string, string>();

  while (ops.length > 0) {
    const op = ops[0];
    try {
      let result: { board: Board } | undefined;
      if (op.kind === "create") {
        result = await api.createTask(op.projectId, { columnId: op.columnId, ...op.data });
        // best-effort: map temp id to the newly created task (last task in column)
        const created = result.board.columns
          .find((c) => c.id === op.columnId)
          ?.tasks.at(-1);
        if (created) tempIdMap.set(op.tempId, created.id);
      } else {
        const realId = resolveId(op.taskId, tempIdMap);
        if (!realId) {
          ops.shift();
          continue;
        }
        if (op.kind === "update") result = await api.updateTask(realId, op.data);
        else if (op.kind === "move") result = await api.moveTask(realId, op.columnId, op.index);
        else if (op.kind === "delete") result = await api.deleteTask(realId);
      }
      if (result) latestBoard = result.board;
      ops.shift();
      saveQueue(projectId, ops);
    } catch (err) {
      if (err instanceof NetworkError) {
        return { board: latestBoard, remaining: ops.length, stoppedOffline: true };
      }
      if (err instanceof ApiError) {
        // unrecoverable for this op (e.g. 404) — drop it and continue
        ops.shift();
        saveQueue(projectId, ops);
        continue;
      }
      throw err;
    }
  }

  saveQueue(projectId, ops);
  return { board: latestBoard, remaining: 0, stoppedOffline: false };
}

function resolveId(id: string, map: Map<string, string>): string | null {
  if (map.has(id)) return map.get(id)!;
  if (id.startsWith("temp-")) return null; // temp task that never synced
  return id;
}
