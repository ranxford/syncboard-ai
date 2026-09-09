import { prisma } from "../prisma.js";
import { ai } from "../ai/index.js";
import { buildCodeCorpus } from "./codeExtract.js";
import { loadMemberReviewSources } from "./loadReviewSources.js";
import { broadcastBoardUpdate, recordActivity } from "./board.js";
import { resolveMemberBrief } from "./alignmentPositions.js";

export async function gatherTaskReviewContext(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true } },
      comments: { orderBy: { createdAt: "asc" }, select: { body: true } },
      project: { select: { id: true, name: true, requirements: true, field: true } },
    },
  });
  if (!task) return null;

  const membership = task.assigneeId
    ? await prisma.membership.findUnique({
        where: { userId_projectId: { userId: task.assigneeId, projectId: task.projectId } },
      })
    : null;

  const brief = resolveMemberBrief({
    field: task.project.field,
    positionKey: membership?.positionKey ?? "",
    positionLabel: membership?.positionLabel ?? "",
    assignedRequirements: membership?.assignedRequirements ?? "",
  });

  const sources = task.assigneeId
    ? await loadMemberReviewSources(task.projectId, task.assigneeId)
    : [];
  const extracted = await buildCodeCorpus(task.projectId, sources);
  const artifactSummary = sources
    .map((s) => `${s.kind}: ${s.label || s.fileName || s.externalUrl}`)
    .join("; ");

  return {
    task,
    brief,
    assigneeName: task.assignee?.name ?? "Unassigned",
    comments: task.comments.map((c) => c.body),
    artifactSummary,
    codeExcerpt: extracted.corpus.slice(0, 8000),
  };
}

export async function runTaskReview(taskId: string): Promise<void> {
  const ctx = await gatherTaskReviewContext(taskId);
  if (!ctx) return;

  await prisma.task.update({
    where: { id: taskId },
    data: { reviewStatus: "pending", reviewFeedback: "DeepSeek is reviewing…" },
  });
  await broadcastBoardUpdate(ctx.task.projectId);

  const result = await ai.reviewTaskWork({
    taskTitle: ctx.task.title,
    taskDescription: ctx.task.description,
    comments: ctx.comments,
    projectRequirements: ctx.task.project.requirements,
    memberRequirements: ctx.brief.assignedRequirements,
    positionLabel: ctx.brief.positionLabel,
    artifactSummary: ctx.artifactSummary,
    codeExcerpt: ctx.codeExcerpt,
  });

  await prisma.task.update({
    where: { id: taskId },
    data: {
      reviewStatus: result.passed ? "passed" : "failed",
      reviewFeedback: result.feedback,
      reviewCheckedAt: new Date(),
    },
  });

  await recordActivity({
    projectId: ctx.task.projectId,
    userId: ctx.task.assigneeId,
    type: "ai.insight",
    message: `DeepSeek review ${result.passed ? "passed" : "failed"} for "${ctx.task.title}"`,
    meta: { taskId, score: result.score, passed: result.passed },
  });

  await broadcastBoardUpdate(ctx.task.projectId);
}

export async function runProjectReviewAnalysis(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      columns: { include: { tasks: { include: { assignee: { select: { name: true } } } } } },
      members: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!project) return;

  const reviewColIds = new Set(
    project.columns.filter((c) => /review|qa|inspection/i.test(c.name)).map((c) => c.id),
  );
  const reviewTasks = project.columns
    .flatMap((c) => c.tasks)
    .filter((t) => reviewColIds.has(t.columnId))
    .map((t) => ({
      title: t.title,
      assigneeName: t.assignee?.name ?? "Unassigned",
      description: t.description,
      reviewStatus: t.reviewStatus,
    }));

  if (reviewTasks.length === 0) return;

  const members = project.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    positionLabel: m.positionLabel,
    assignedRequirements: m.assignedRequirements,
  }));

  const analysis = await ai.analyzeProjectReview({
    projectName: project.name,
    requirements: project.requirements,
    reviewTasks,
    members,
  });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      reviewAnalysis: JSON.stringify(analysis),
      reviewAnalysisAt: new Date(),
    },
  });

  await broadcastBoardUpdate(projectId);
}
