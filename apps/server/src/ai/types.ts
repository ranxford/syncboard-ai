export type InsightSeverity = "info" | "warning" | "critical";

export type InsightType =
  | "stagnation"
  | "deadline_risk"
  | "wip_limit"
  | "workload"
  | "throughput"
  | "alignment"
  | "requirements";

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

export interface GeneratedMemberTask {
  assigneeId: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
}

export interface TaskReviewResult {
  passed: boolean;
  feedback: string;
  score: number;
}

export interface ProjectReviewAnalysis {
  summary: string;
  blockers: string[];
  recommendations: string[];
}

export interface AiMemberContext {
  id: string;
  name: string;
  positionLabel: string;
  assignedRequirements: string;
}

export interface AiProvider {
  analyzeBoard(board: AiBoard): Promise<AnalyticsResult>;
  summarizeMeeting(transcript: string): Promise<MeetingResult>;
  generateMemberTasks(input: {
    instruction: string;
    projectName: string;
    projectRequirements: string;
    members: AiMemberContext[];
  }): Promise<GeneratedMemberTask[]>;
  reviewTaskWork(input: {
    taskTitle: string;
    taskDescription: string;
    comments: string[];
    projectRequirements: string;
    memberRequirements: string;
    positionLabel: string;
    artifactSummary: string;
    codeExcerpt: string;
  }): Promise<TaskReviewResult>;
  analyzeProjectReview(input: {
    projectName: string;
    requirements: string;
    reviewTasks: { title: string; assigneeName: string; description: string; reviewStatus: string }[];
    members: AiMemberContext[];
  }): Promise<ProjectReviewAnalysis>;
  providerName(): string;
}
