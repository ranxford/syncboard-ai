import type {
  AnalyticsResult,
  Board,
  Comment,
  MeetingResult,
  MyTask,
  Priority,
  ProjectSummary,
  SearchResult,
  User,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "syncboard.token";

export { API_URL };

export class NetworkError extends Error {
  constructor() {
    super("network-unavailable");
    this.name = "NetworkError";
  }
}

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
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
    let data: Record<string, unknown> = {};
    try {
      const body = await res.json();
      data = body && typeof body === "object" ? body : {};
      if (typeof body?.error === "string") message = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status, data);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

  // ── Auth ──────────────────────────────────────────────────────
export const api = {
  register: (data: { email: string; name: string; password: string }) =>
    request<{
      token?: string;
      user?: User;
      needsVerification?: boolean;
      email?: string;
      demoToken?: string;
      message?: string;
    }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  confirmEmail: (data: { email: string; token: string }) =>
    request<{ token: string; user: User }>("/api/auth/confirm", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resendConfirmation: (email: string) =>
    request<{ ok: true; demoToken?: string; message?: string }>("/api/auth/resend-confirmation", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => request<{ user: User }>("/api/auth/me"),

  // ── Projects ────────────────────────────────────────────────
  listProjects: () => request<{ projects: ProjectSummary[] }>("/api/projects"),

  createProject: (data: {
    name: string;
    description?: string;
    visibility?: "personal" | "shared";
    field?: string;
  }) =>
    request<{ board: Board }>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProject: (
    projectId: string,
    data: {
      name?: string;
      description?: string;
      visibility?: "personal" | "shared";
      field?: string;
    },
  ) =>
    request<{ board: Board }>(`/api/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getBoard: (projectId: string) => request<{ board: Board }>(`/api/projects/${projectId}`),

  deleteProject: (projectId: string) =>
    request<{ ok: true }>(`/api/projects/${projectId}`, { method: "DELETE" }),

  getActivity: (projectId: string) =>
    request<{ activities: import("./types").Activity[] }>(`/api/projects/${projectId}/activity`),

  getTeam: (projectId: string) =>
    request<{
      visibility: "personal" | "shared";
      members: import("./types").TeamMember[];
      invites: import("./types").PendingInvite[];
    }>(`/api/projects/${projectId}/members`),

  addMember: (projectId: string, email: string, role?: "admin" | "member") =>
    request<{
      board?: Board;
      invited?: { email: string; status: string; inviteId?: string };
      message?: string;
    }>(`/api/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  updateMemberRole: (projectId: string, userId: string, role: "admin" | "member") =>
    request<{ ok: true }>(`/api/projects/${projectId}/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  removeMember: (projectId: string, userId: string) =>
    request<{ board: Board }>(`/api/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
    }),

  revokeInvite: (projectId: string, inviteId: string) =>
    request<{ ok: true }>(`/api/projects/${projectId}/invites/${inviteId}`, {
      method: "DELETE",
    }),

  getTimelines: (projectId: string) =>
    request<import("./types").CommunityTimelines>(`/api/projects/${projectId}/timelines`),

  getMilestones: (projectId: string) =>
    request<{
      milestones: import("./types").Milestone[];
      progress: { totalTasks: number; doneTasks: number; progressPct: number };
    }>(`/api/projects/${projectId}/milestones`),

  createMilestone: (
    projectId: string,
    data: {
      title: string;
      description?: string;
      status?: string;
      targetDate?: string | null;
      scope?: "community" | "personal";
    },
  ) =>
    request<{ milestone: import("./types").Milestone }>(`/api/projects/${projectId}/milestones`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  shareMilestoneToCommunity: (milestoneId: string) =>
    request<{ milestone: import("./types").Milestone }>(
      `/api/milestones/${milestoneId}/share-to-community`,
      { method: "POST" },
    ),

  updateMilestone: (
    id: string,
    data: Partial<{ title: string; description: string; status: string; targetDate: string | null }>,
  ) =>
    request<{ milestone: import("./types").Milestone }>(`/api/milestones/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteMilestone: (id: string) =>
    request<{ ok: true }>(`/api/milestones/${id}`, { method: "DELETE" }),

  getIdeas: (projectId: string) =>
    request<{ ideas: import("./types").Idea[] }>(`/api/projects/${projectId}/ideas`),

  createIdea: (projectId: string, data: { title: string; body?: string }) =>
    request<{ idea: import("./types").Idea }>(`/api/projects/${projectId}/ideas`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  voteIdea: (ideaId: string) =>
    request<{ idea: import("./types").Idea }>(`/api/ideas/${ideaId}/vote`, { method: "POST" }),

  promoteIdea: (ideaId: string) =>
    request<{ idea: import("./types").Idea; board: Board }>(`/api/ideas/${ideaId}/promote`, {
      method: "POST",
    }),

  archiveIdea: (ideaId: string) =>
    request<{ ok: true }>(`/api/ideas/${ideaId}`, { method: "DELETE" }),

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
      labels?: string[];
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
      labels: string[];
    }>,
  ) =>
    request<{ board: Board }>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  searchTasks: (projectId: string, q: string) =>
    request<{ results: SearchResult[] }>(
      `/api/projects/${projectId}/tasks/search?q=${encodeURIComponent(q)}`,
    ),

  myTasks: () => request<{ tasks: MyTask[] }>("/api/me/tasks"),

  // ── Comments ────────────────────────────────────────────────
  getComments: (taskId: string) =>
    request<{ comments: Comment[] }>(`/api/tasks/${taskId}/comments`),

  addComment: (taskId: string, body: string) =>
    request<{ comment: Comment }>(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),

  deleteComment: (commentId: string) =>
    request<{ ok: true }>(`/api/comments/${commentId}`, { method: "DELETE" }),

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

  getAlignment: (projectId: string) =>
    request<{
      alignment: import("./types").AlignmentReport;
      projectField?: string;
      fieldLabel?: string;
      positionTracks?: import("./types").AlignmentTrack[];
      memberAssignments?: import("./types").MemberRoleAssignment[];
      effectiveness?: import("./types").AlignmentEffectiveness;
      canManageRequirements: boolean;
    }>(`/api/projects/${projectId}/alignment`),

  updateRequirements: (projectId: string, requirements: string) =>
    request<{ ok: true; requirements: string }>(`/api/projects/${projectId}/requirements`, {
      method: "PUT",
      body: JSON.stringify({ requirements }),
    }),

  updateMemberRequirements: (
    projectId: string,
    assignments: {
      userId: string;
      positionKey?: string;
      positionLabel: string;
      assignedRequirements: string;
    }[],
  ) =>
    request<{ ok: true }>(`/api/projects/${projectId}/member-requirements`, {
      method: "PUT",
      body: JSON.stringify({ assignments }),
    }),

  getSubmissionReadiness: (projectId: string) =>
    request<{
      readiness: import("./types").SubmissionReadiness;
      existingSubmission: {
        status: string;
        submittedAt: string;
        alignmentScore: number;
      } | null;
    }>(`/api/projects/${projectId}/submission/readiness`),

  submitDeliverable: (projectId: string) =>
    request<{ submission: import("./types").DeliverableSubmissionRow }>(
      `/api/projects/${projectId}/submission`,
      { method: "POST", body: JSON.stringify({}) },
    ),

  listSubmissions: (projectId: string) =>
    request<{ submissions: import("./types").DeliverableSubmissionRow[] }>(
      `/api/projects/${projectId}/submissions`,
    ),

  reviewSubmission: (
    projectId: string,
    userId: string,
    data: { status: "accepted" | "revision_requested"; reviewerNote?: string },
  ) =>
    request<{ submission: import("./types").DeliverableSubmissionRow }>(
      `/api/projects/${projectId}/submissions/${userId}`,
      { method: "PATCH", body: JSON.stringify(data) },
    ),

  listReviewSources: (projectId: string, userId?: string) =>
    request<{ sources: import("./types").ReviewSource[] }>(
      `/api/projects/${projectId}/review-sources${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`,
    ),

  addReviewLink: (
    projectId: string,
    data: { url: string; label: string; note?: string },
  ) =>
    request<{ source: import("./types").ReviewSource }>(
      `/api/projects/${projectId}/review-sources/link`,
      { method: "POST", body: JSON.stringify(data) },
    ),

  uploadReviewFile: async (
    projectId: string,
    file: File,
    opts?: { label?: string; note?: string },
  ) => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    if (opts?.label) form.append("label", opts.label);
    if (opts?.note) form.append("note", opts.note);
    const res = await fetch(`${API_URL}/api/projects/${projectId}/review-sources/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      let message = "Upload failed";
      try {
        const body = await res.json();
        if (typeof body?.error === "string") message = body.error;
      } catch {
        /* ignore */
      }
      throw new ApiError(message, res.status);
    }
    return (await res.json()) as { source: import("./types").ReviewSource };
  },

  deleteReviewSource: (projectId: string, sourceId: string) =>
    request<{ ok: true }>(`/api/projects/${projectId}/review-sources/${sourceId}`, {
      method: "DELETE",
    }),

  fetchReviewSourceBlob: async (projectId: string, sourceId: string) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/api/projects/${projectId}/review-sources/${sourceId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError("Could not load file", res.status);
    return res.blob();
  },

  generateReviewBrief: (projectId: string, userId: string) =>
    request<{ brief: string; submissionId: string; generatedAt: string }>(
      `/api/projects/${projectId}/submissions/${userId}/review-brief`,
      { method: "POST", body: JSON.stringify({}) },
    ),

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

  dashboard: () =>
    request<{ projects: import("./types").ProjectSummary[]; teammates: import("./types").TeammateStatus[] }>(
      "/api/dashboard",
    ),

  getTaskSyncRoomSessions: (taskId: string) =>
    request<{ sessions: import("./types").SyncRoomSessionSummary[] }>(
      `/api/syncroom/tasks/${taskId}/sessions`,
    ),

  finalizeSyncRoomSession: (
    sessionId: string,
    data: {
      notes?: string;
      summary?: string;
      decisions?: string[];
      whiteboard?: string;
      applied?: boolean;
    },
  ) =>
    request<{ session: import("./types").SyncRoomSessionSummary }>(
      `/api/syncroom/sessions/${sessionId}`,
      { method: "PATCH", body: JSON.stringify(data) },
    ),

  getSessionArtifacts: (sessionId: string) =>
    request<{ artifacts: import("./types").SyncRoomArtifact[] }>(
      `/api/syncroom/sessions/${sessionId}/artifacts`,
    ),

  addSessionArtifact: (sessionId: string, label: string, url: string) =>
    request<{ artifact: import("./types").SyncRoomArtifact }>(
      `/api/syncroom/sessions/${sessionId}/artifacts`,
      { method: "POST", body: JSON.stringify({ label, url }) },
    ),
};
