export interface User {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: string;
}

export type Priority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string;
  priority: Priority;
  assigneeId: string | null;
  estimateHours: number | null;
  dueDate: string | null;
  enteredColumnAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string; avatarColor: string } | null;
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  order: number;
  wipLimit: number | null;
  tasks: Task[];
}

export interface Board {
  project: {
    id: string;
    name: string;
    description: string;
    ownerId: string;
    createdAt: string;
  };
  members: Member[];
  columns: Column[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  role: string;
  taskCount: number;
  memberCount: number;
  createdAt: string;
}

export interface PresenceUser {
  userId: string;
  name: string;
  avatarColor: string;
  focusedTaskId: string | null;
}

export interface Activity {
  id: string;
  type: string;
  message: string;
  meta: Record<string, unknown>;
  createdAt: string;
  user?: { id: string; name: string; avatarColor: string } | null;
}

// ── AI / analytics ────────────────────────────────────────────
export type InsightSeverity = "info" | "warning" | "critical";

export interface Insight {
  id: string;
  type: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  recommendation?: string;
  taskIds?: string[];
  userId?: string;
}

export interface WorkloadEntry {
  userId: string;
  name: string;
  avatarColor: string;
  openTasks: number;
  estimateHours: number;
  loadScore: number;
}

export interface RebalanceSuggestion {
  taskId: string;
  taskTitle: string;
  fromUserId: string | null;
  fromName: string;
  toUserId: string;
  toName: string;
  reason: string;
}

export interface BoardMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
  avgCycleTimeHours: number | null;
}

export interface AnalyticsResult {
  generatedAt: string;
  metrics: BoardMetrics;
  insights: Insight[];
  workload: WorkloadEntry[];
  rebalance: RebalanceSuggestion[];
}

export interface MeetingResult {
  summary: string;
  decisions: string[];
  actionItems: { title: string; priority: Priority; assigneeHint?: string }[];
}
