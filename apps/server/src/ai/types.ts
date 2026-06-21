export type InsightSeverity = "info" | "warning" | "critical";

export type InsightType =
  | "stagnation"
  | "deadline_risk"
  | "wip_limit"
  | "workload"
  | "throughput";

export interface Insight {
  id: string;
  type: InsightType;
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
  /** normalized 0..1 load score relative to the team */
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
  completionRate: number; // 0..1
  avgCycleTimeHours: number | null;
}

export interface AnalyticsResult {
  generatedAt: string;
  metrics: BoardMetrics;
  insights: Insight[];
  workload: WorkloadEntry[];
  rebalance: RebalanceSuggestion[];
}

export interface ActionItem {
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  assigneeHint?: string;
}

export interface MeetingResult {
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
}

/** Shape of board data the AI engine consumes (matches getBoardState output). */
export interface AiTask {
  id: string;
  title: string;
  priority: string;
  assigneeId: string | null;
  estimateHours: number | null;
  dueDate: Date | null;
  enteredColumnAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export interface AiColumn {
  id: string;
  name: string;
  order: number;
  wipLimit: number | null;
  tasks: AiTask[];
}

export interface AiMember {
  id: string;
  name: string;
  avatarColor: string;
}

export interface AiBoard {
  columns: AiColumn[];
  members: AiMember[];
}

export interface AiProvider {
  analyzeBoard(board: AiBoard): Promise<AnalyticsResult>;
  summarizeMeeting(transcript: string): Promise<MeetingResult>;
}
