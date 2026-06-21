import type {
  AnalyticsResult,
  Board,
  MeetingResult,
  Priority,
  ProjectSummary,
  User,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "syncboard.token";

export class NetworkError extends Error {
  constructor() {
    super("network-unavailable");
    this.name = "NetworkError";
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    // fetch rejects on network failure → surface a typed error for the offline queue
    throw new NetworkError();
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ── Auth ──────────────────────────────────────────────────────
export const api = {
  register: (data: { email: string; name: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => request<{ user: User }>("/api/auth/me"),

  // ── Projects ────────────────────────────────────────────────
  listProjects: () => request<{ projects: ProjectSummary[] }>("/api/projects"),

  createProject: (data: { name: string; description?: string }) =>
    request<{ board: Board }>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getBoard: (projectId: string) => request<{ board: Board }>(`/api/projects/${projectId}`),

  getActivity: (projectId: string) =>
    request<{ activities: import("./types").Activity[] }>(`/api/projects/${projectId}/activity`),

  addMember: (projectId: string, email: string) =>
    request<{ board: Board }>(`/api/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  // ── Tasks ───────────────────────────────────────────────────
  createTask: (
    projectId: string,
    data: {
      columnId: string;
      title: string;
      description?: string;
      priority?: Priority;
      assigneeId?: string | null;
      estimateHours?: number | null;
      dueDate?: string | null;
    },
  ) =>
    request<{ board: Board }>(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTask: (
    taskId: string,
    data: Partial<{
      title: string;
      description: string;
      priority: Priority;
      assigneeId: string | null;
      estimateHours: number | null;
      dueDate: string | null;
    }>,
  ) =>
    request<{ board: Board }>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  moveTask: (taskId: string, columnId: string, index: number) =>
    request<{ board: Board }>(`/api/tasks/${taskId}/move`, {
      method: "POST",
      body: JSON.stringify({ columnId, index }),
    }),

  deleteTask: (taskId: string) =>
    request<{ board: Board }>(`/api/tasks/${taskId}`, { method: "DELETE" }),

  // ── AI / analytics ──────────────────────────────────────────
  getAnalytics: (projectId: string) =>
    request<{ analytics: AnalyticsResult }>(`/api/projects/${projectId}/analytics`),

  summarizeMeeting: (transcript: string) =>
    request<{ result: MeetingResult }>("/api/ai/meeting", {
      method: "POST",
      body: JSON.stringify({ transcript }),
    }),

  importTasks: (
    projectId: string,
    columnId: string,
    items: { title: string; priority: Priority; assigneeId?: string | null }[],
  ) =>
    request<{ board: Board }>(`/api/projects/${projectId}/ai/import-tasks`, {
      method: "POST",
      body: JSON.stringify({ columnId, items }),
    }),
};

export { API_URL };
