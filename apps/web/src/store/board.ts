import { create } from "zustand";
import { api, NetworkError } from "@/lib/api";
import { enqueue, flushQueue, loadQueue } from "@/lib/offlineQueue";
import { toast } from "@/store/toast";
import type { Board, Column, Priority, PresenceUser, Task } from "@/lib/types";

type Connection = "online" | "offline";

/** Announce the first transition into offline so queued edits aren't a surprise. */
function noteOffline(prevConnection: Connection) {
  if (prevConnection !== "offline") {
    toast.info("You're offline — changes are queued and will sync when you reconnect.");
  }
}
function noteError(e: unknown) {
  toast.error(e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.");
}

interface BoardState {
  projectId: string | null;
  board: Board | null;
  presence: PresenceUser[];
  connection: Connection;
  syncing: boolean;
  pendingCount: number;
  latency: number | null;
  loading: boolean;
  error: string | null;

  init: (projectId: string) => Promise<void>;
  reset: () => void;
  applyServerBoard: (board: Board) => void;
  setPresence: (users: PresenceUser[]) => void;
  setConnection: (c: Connection) => void;
  setLatency: (ms: number | null) => void;

  createTask: (columnId: string, data: NewTaskInput) => Promise<void>;
  updateTask: (taskId: string, data: UpdateTaskInput) => Promise<void>;
  moveTask: (taskId: string, toColumnId: string, index: number) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  flush: () => Promise<void>;
}

interface NewTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string | null;
  estimateHours?: number | null;
  dueDate?: string | null;
  labels?: string[];
}
type UpdateTaskInput = Partial<{
  title: string;
  description: string;
  priority: Priority;
  assigneeId: string | null;
  estimateHours: number | null;
  dueDate: string | null;
  labels: string[];
}>;

// ── pure helpers on board state ───────────────────────────────
function mapColumns(board: Board, fn: (c: Column) => Column): Board {
  return { ...board, columns: board.columns.map(fn) };
}

function removeTask(board: Board, taskId: string): { board: Board; task: Task | null } {
  let removed: Task | null = null;
  const columns = board.columns.map((c) => {
    const idx = c.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return c;
    removed = c.tasks[idx];
    return { ...c, tasks: c.tasks.filter((t) => t.id !== taskId) };
  });
  return { board: { ...board, columns }, task: removed };
}

export const useBoard = create<BoardState>((set, get) => ({
  projectId: null,
  board: null,
  presence: [],
  connection: "online",
  syncing: false,
  pendingCount: 0,
  latency: null,
  loading: false,
  error: null,

  init: async (projectId) => {
    set({ projectId, loading: true, error: null });
    try {
      const { board } = await api.getBoard(projectId);
      set({ board, loading: false, pendingCount: loadQueue(projectId).length });
    } catch (e: any) {
      if (e instanceof NetworkError) {
        set({ loading: false, connection: "offline" });
      } else {
        set({ loading: false, error: e.message ?? "Failed to load board" });
      }
    }
  },

  reset: () => set({ projectId: null, board: null, presence: [], error: null }),

  applyServerBoard: (board) => {
    // Server is the source of truth, but don't clobber unsynced local edits.
    if (get().pendingCount > 0) return;
    set({ board });
  },

  setPresence: (users) => set({ presence: users }),
  setConnection: (connection) => set({ connection }),
  setLatency: (latency) => set({ latency }),

  createTask: async (columnId, data) => {
    const { board, projectId } = get();
    if (!board || !projectId) return;
    const tempId = `temp-${Math.random().toString(36).slice(2, 9)}`;
    const member = board.members.find((m) => m.id === data.assigneeId);
    const optimistic: Task = {
      id: tempId,
      projectId,
      columnId,
      title: data.title,
      description: data.description ?? "",
      priority: data.priority ?? "medium",
      labels: data.labels ?? [],
      assigneeId: data.assigneeId ?? null,
      estimateHours: data.estimateHours ?? null,
      dueDate: data.dueDate ?? null,
      enteredColumnAt: new Date().toISOString(),
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignee: member ? { id: member.id, name: member.name, avatarColor: member.avatarColor } : null,
    };
    set({
      board: mapColumns(board, (c) =>
        c.id === columnId ? { ...c, tasks: [...c.tasks, optimistic] } : c,
      ),
    });

    try {
      const res = await api.createTask(projectId, { columnId, ...data });
      get().applyServerBoard(res.board);
    } catch (e) {
      if (e instanceof NetworkError) {
        const prev = get().connection;
        enqueue(projectId, { kind: "create", tempId, projectId, columnId, data });
        set({ connection: "offline", pendingCount: loadQueue(projectId).length });
        noteOffline(prev);
      } else {
        noteError(e);
        throw e;
      }
    }
  },

  updateTask: async (taskId, data) => {
    const { board, projectId } = get();
    if (!board || !projectId) return;
    const member = data.assigneeId !== undefined ? board.members.find((m) => m.id === data.assigneeId) : undefined;
    set({
      board: mapColumns(board, (c) => ({
        ...c,
        tasks: c.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                ...data,
                assignee:
                  data.assigneeId !== undefined
                    ? member
                      ? { id: member.id, name: member.name, avatarColor: member.avatarColor }
                      : null
                    : t.assignee,
              }
            : t,
        ),
      })),
    });

    try {
      const res = await api.updateTask(taskId, data);
      get().applyServerBoard(res.board);
    } catch (e) {
      if (e instanceof NetworkError) {
        const prev = get().connection;
        enqueue(projectId, { kind: "update", taskId, data });
        set({ connection: "offline", pendingCount: loadQueue(projectId).length });
        noteOffline(prev);
      } else {
        noteError(e);
        throw e;
      }
    }
  },

  moveTask: async (taskId, toColumnId, index) => {
    const { board, projectId } = get();
    if (!board || !projectId) return;
    const { board: without, task } = removeTask(board, taskId);
    if (!task) return;
    const moved: Task = { ...task, columnId: toColumnId };
    const next = mapColumns(without, (c) => {
      if (c.id !== toColumnId) return c;
      const tasks = [...c.tasks];
      tasks.splice(Math.min(index, tasks.length), 0, moved);
      return { ...c, tasks };
    });
    set({ board: next });

    try {
      const res = await api.moveTask(taskId, toColumnId, index);
      get().applyServerBoard(res.board);
    } catch (e) {
      if (e instanceof NetworkError) {
        const prev = get().connection;
        enqueue(projectId, { kind: "move", taskId, columnId: toColumnId, index });
        set({ connection: "offline", pendingCount: loadQueue(projectId).length });
        noteOffline(prev);
      } else {
        noteError(e);
        throw e;
      }
    }
  },

  deleteTask: async (taskId) => {
    const { board, projectId } = get();
    if (!board || !projectId) return;
    set({ board: removeTask(board, taskId).board });
    try {
      const res = await api.deleteTask(taskId);
      get().applyServerBoard(res.board);
    } catch (e) {
      if (e instanceof NetworkError) {
        const prev = get().connection;
        enqueue(projectId, { kind: "delete", taskId });
        set({ connection: "offline", pendingCount: loadQueue(projectId).length });
        noteOffline(prev);
      } else {
        noteError(e);
        throw e;
      }
    }
  },

  flush: async () => {
    const { projectId, pendingCount } = get();
    if (!projectId) return;
    if (pendingCount === 0) {
      // nothing queued — just confirm we're online and refresh
      try {
        const { board } = await api.getBoard(projectId);
        set({ board, connection: "online" });
      } catch {
        /* still offline */
      }
      return;
    }
    set({ syncing: true });
    const synced = pendingCount;
    const result = await flushQueue(projectId);
    set({
      syncing: false,
      pendingCount: result.remaining,
      connection: result.stoppedOffline ? "offline" : "online",
    });
    if (result.remaining === 0) {
      try {
        const { board } = await api.getBoard(projectId);
        set({ board, connection: "online" });
      } catch {
        /* ignore */
      }
      toast.success(`All caught up — ${synced} change${synced === 1 ? "" : "s"} synced.`);
    } else if (result.board) {
      set({ board: result.board });
    }
  },
}));
