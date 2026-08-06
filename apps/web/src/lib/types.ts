export interface User {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  emailVerified?: boolean;
}

export type ProjectVisibility = "personal" | "shared";

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
  labels: string[];
  assigneeId: string | null;
  estimateHours: number | null;
  dueDate: string | null;
  enteredColumnAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string; avatarColor: string } | null;
}

export interface Comment {
  id: string;
  taskId: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string; avatarColor: string };
}

export interface SearchResult {
  id: string;
  title: string;
  priority: Priority;
  labels: string[];
  column: { id: string; name: string };
  assignee: { id: string; name: string; avatarColor: string } | null;
}

export interface MyTask {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string | null;
  labels: string[];
  project: { id: string; name: string };
  column: { id: string; name: string };
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
    visibility: ProjectVisibility;
    field?: string;
    requirements?: string;
  };
  members: Member[];
  columns: Column[];
}

export type AlignmentStatus = "aligned" | "drifting" | "off_track" | "no_brief";

export interface CollaboratorAlignment {
  userId: string;
  name: string;
  avatarColor: string;
  role: string;
  positionKey: string;
  positionLabel: string;
  assignedRequirements: string;
  score: number;
  status: AlignmentStatus;
  summary: string;
  coveredThemes: string[];
  missingThemes: string[];
  offTrackTasks: { id: string; title: string; reason: string }[];
  workSampleCount: number;
  aiFeedback?: string;
  aiSuggestions?: string[];
}

export interface MemberRoleAssignment {
  userId: string;
  name: string;
  email: string;
  avatarColor: string;
  role: string;
  positionKey: string;
  positionLabel: string;
  assignedRequirements: string;
}

export interface AlignmentTrack {
  key: string;
  label: string;
  shortLabel: string;
  defaultCriteria: string;
  accent: string;
}

export interface AlignmentReport {
  generatedAt: string;
  requirements: string;
  hasBrief: boolean;
  collaborators: CollaboratorAlignment[];
}

export interface AlignmentEffectiveness {
  hasBrief: boolean;
  aligned: number;
  drifting: number;
  offTrack: number;
  needsBrief: boolean;
}

export interface SubmissionBlocker {
  code: string;
  message: string;
}

export interface SubmissionReadiness {
  ready: boolean;
  score: number;
  status: AlignmentStatus;
  blockers: SubmissionBlocker[];
  member: CollaboratorAlignment | null;
  codeReview?: CodeReviewResult | null;
}

export interface DeliverableSubmissionRow {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  avatarColor: string;
  status: string;
  memberSummary: string;
  alignmentScore: number;
  alignmentStatus: string;
  blockers: unknown[];
  submittedAt: string;
  reviewedAt: string | null;
  reviewerNote: string;
  reviewBrief: string;
  reviewBriefAt: string | null;
  sources: ReviewSource[];
}

export type ReviewSourceKind = "file" | "figma_link" | "figma_export" | "link" | "repo_link" | "code_zip" | "code_file";

export interface CodeReviewResult {
  analyzed: boolean;
  isTechTrack: boolean;
  hasCodeSources: boolean;
  fileCount: number;
  totalChars: number;
  score: number;
  coveredThemes: string[];
  missingThemes: string[];
  findings: string[];
  structureHints: string[];
  repoLinks: string[];
  truncated: boolean;
}

export interface ReviewSource {
  id: string;
  projectId: string;
  userId: string;
  submissionId: string | null;
  kind: ReviewSourceKind;
  label: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  externalUrl: string;
  note: string;
  createdAt: string;
  downloadUrl: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  visibility: ProjectVisibility;
  field?: string;
  role: string;
  taskCount: number;
  memberCount: number;
  createdAt: string;
  overdueTasks?: number;
  stalledTasks?: number;
  syncRoomActive?: boolean;
  effectiveness?: AlignmentEffectiveness;
  myAlignmentStatus?: AlignmentStatus | "no_brief";
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: string;
  membershipId: string;
  joinedAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  ownerId: string | null;
  title: string;
  description: string;
  status: "upcoming" | "active" | "done";
  order: number;
  targetDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface MemberTimeline {
  userId: string;
  name: string;
  avatarColor: string;
  role: string;
  positionKey: string;
  positionLabel: string;
  isMe: boolean;
  milestones: Milestone[];
  progressPct: number;
}

export interface CommunityTimelines {
  community: { milestones: Milestone[]; progressPct: number };
  members: MemberTimeline[];
  boardProgress: { totalTasks: number; doneTasks: number; progressPct: number };
  canManageCommunity: boolean;
}

export interface Idea {
  id: string;
  projectId: string;
  title: string;
  body: string;
  status: "open" | "promoted" | "archived";
  promotedTaskId: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarColor: string };
  voteCount: number;
  votedByMe: boolean;
}

export interface SyncRoomArtifact {
  id: string;
  label: string;
  url: string;
  createdAt: string;
}

export interface SyncRoomSessionSummary {
  id: string;
  startedAt: string;
  endedAt: string | null;
  contextTaskTitle: string | null;
  summary: string | null;
  decisions: string[];
  appliedAt: string | null;
  eventCount: number;
  startedBy: { id: string; name: string; avatarColor: string };
  artifacts?: SyncRoomArtifact[];
}

export interface TeammateStatus {
  userId: string;
  name: string;
  avatarColor: string;
  projectId: string | null;
  projectName: string | null;
  focusedTaskId: string | null;
  focusTaskTitle: string | null;
  inSyncRoom: boolean;
  syncRoomTaskTitle: string | null;
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
