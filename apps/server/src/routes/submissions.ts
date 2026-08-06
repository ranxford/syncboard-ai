import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertMember, getMembership } from "../lib/access.js";
import { buildAlignmentReport, filterAlignmentReportForViewer } from "../lib/alignmentReport.js";
import { generateCollaboratorFeedback } from "../ai/alignmentFeedback.js";
import { evaluateSubmissionReadiness } from "../ai/alignment.js";
import { reviewMemberCode } from "../ai/codeReview.js";
import { loadMemberReviewSources } from "../lib/loadReviewSources.js";
import { readinessMemberWithDeliverables } from "../lib/submissionReadiness.js";
import { recordActivity } from "../lib/board.js";

import { serializeReviewSource } from "../lib/reviewSources.js";

export const submissionsRouter = Router();
submissionsRouter.use(requireAuth);

function serializeSubmission(row: {
  id: string;
  projectId: string;
  userId: string;
  status: string;
  memberSummary: string;
  alignmentScore: number;
  alignmentStatus: string;
  blockersJson: string;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewerNote: string;
  reviewBrief: string;
  reviewBriefAt: Date | null;
  user: { id: string; name: string; avatarColor: string };
  sources?: Parameters<typeof serializeReviewSource>[0][];
}) {
  let blockers: unknown[] = [];
  try {
    blockers = JSON.parse(row.blockersJson) as unknown[];
  } catch {
    blockers = [];
  }
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    userName: row.user.name,
    avatarColor: row.user.avatarColor,
    status: row.status,
    memberSummary: row.memberSummary,
    alignmentScore: row.alignmentScore,
    alignmentStatus: row.alignmentStatus,
    blockers,
    submittedAt: row.submittedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewerNote: row.reviewerNote,
    reviewBrief: row.reviewBrief,
    reviewBriefAt: row.reviewBriefAt?.toISOString() ?? null,
    sources: row.sources?.map((s) => serializeReviewSource(s)) ?? [],
  };
}

/** Pre-submit check — AI readiness vs manager requirements (member only). */
submissionsRouter.get("/projects/:projectId/submission/readiness", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const membership = await getMembership(req.userId!, req.params.projectId);
  if (membership?.role !== "member") {
    return res.status(403).json({ error: "Only members submit deliverables; managers set requirements." });
  }

  const built = await buildAlignmentReport(req.params.projectId);
  if (!built) return res.status(404).json({ error: "Project not found" });

  const sources = await loadMemberReviewSources(req.params.projectId, req.userId!);
  const report = await readinessMemberWithDeliverables(built, req.params.projectId, req.userId!, sources);
  const member = report.collaborators.find((c) => c.userId === req.userId!);
  const codeReview = await reviewMemberCode({
    projectId: req.params.projectId,
    requirements: member?.assignedRequirements || built.report.requirements,
    positionKey: member?.positionKey ?? "",
    projectField: built.projectField,
    sources,
  });
  const readiness = evaluateSubmissionReadiness(report, req.userId!, codeReview);
  const existing = await prisma.deliverableSubmission.findUnique({
    where: {
      projectId_userId: { projectId: req.params.projectId, userId: req.userId! },
    },
  });

  res.json({
    readiness,
    existingSubmission: existing
      ? {
          status: existing.status,
          submittedAt: existing.submittedAt.toISOString(),
          alignmentScore: existing.alignmentScore,
        }
      : null,
  });
});

/** Submit deliverable — blocked unless readiness.ready (AI gate). */
submissionsRouter.post("/projects/:projectId/submission", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const projectId = req.params.projectId;
  const membership = await getMembership(req.userId!, projectId);
  if (membership?.role !== "member") {
    return res.status(403).json({ error: "Only members submit deliverables." });
  }

  if (
    req.body &&
    typeof req.body === "object" &&
    "memberSummary" in req.body &&
    String((req.body as { memberSummary?: string }).memberSummary ?? "").trim()
  ) {
    return res.status(400).json({
      error: "Manual submission notes are disabled — the server generates AI feedback automatically.",
    });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { visibility: true, name: true },
  });
  if (!project || project.visibility !== "shared") {
    return res.status(400).json({ error: "Submissions are for community projects only." });
  }

  const built = await buildAlignmentReport(projectId);
  if (!built) return res.status(404).json({ error: "Project not found" });

  const memberRow = built.report.collaborators.find((c) => c.userId === req.userId!);
  const sources = await loadMemberReviewSources(projectId, req.userId!);
  const report = await readinessMemberWithDeliverables(built, req.params.projectId, req.userId!, sources);
  const member = report.collaborators.find((c) => c.userId === req.userId!);
  const codeReview = await reviewMemberCode({
    projectId,
    requirements: member?.assignedRequirements || built.report.requirements,
    positionKey: member?.positionKey ?? "",
    projectField: built.projectField,
    sources,
  });
  const readiness = evaluateSubmissionReadiness(report, req.userId!, codeReview);
  if (!readiness.ready || !readiness.member) {
    return res.status(422).json({
      error: "Requirements not met — fix the issues below and try again.",
      readiness,
    });
  }

  const summary = readiness.member
    ? (
        await generateCollaboratorFeedback(
          built.report.requirements,
          readiness.member,
          [
            ...(built.tasksByAssignee.get(req.userId!) ?? [])
              .filter((t) => !t.completedAt)
              .map((t) => `${t.title} ${t.description}`.trim()),
            ...(built.milestonesByOwner.get(req.userId!) ?? []).map(
              (m) => `${m.title} ${m.description}`.trim(),
            ),
          ].filter(Boolean),
        )
      ).feedback
    : "";
  const blockersJson = JSON.stringify([]);

  const submission = await prisma.deliverableSubmission.upsert({
    where: { projectId_userId: { projectId, userId: req.userId! } },
    create: {
      projectId,
      userId: req.userId!,
      status: "submitted",
      memberSummary: summary,
      alignmentScore: readiness.score,
      alignmentStatus: readiness.status,
      blockersJson,
    },
    update: {
      status: "submitted",
      memberSummary: summary,
      alignmentScore: readiness.score,
      alignmentStatus: readiness.status,
      blockersJson,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewerNote: "",
    },
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
  });

  await prisma.reviewSource.updateMany({
    where: {
      projectId,
      userId: req.userId!,
      OR: [{ submissionId: null }, { submissionId: submission.id }],
    },
    data: { submissionId: submission.id },
  });

  const withSources = await prisma.deliverableSubmission.findUnique({
    where: { id: submission.id },
    include: {
      user: { select: { id: true, name: true, avatarColor: true } },
      sources: { orderBy: { createdAt: "asc" } },
    },
  });

  await recordActivity({
    projectId,
    userId: req.userId!,
    type: "deliverable_submitted",
    message: `${submission.user.name} submitted their deliverable (${readiness.score}% alignment)`,
    meta: { submissionId: submission.id, score: readiness.score },
    audience: "admins",
  });

  res.json({ submission: serializeSubmission(withSources!) });
});

/** Admin: list member submissions for this project. */
submissionsRouter.get("/projects/:projectId/submissions", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const membership = await getMembership(req.userId!, req.params.projectId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  if (!isAdmin) return res.status(403).json({ error: "Only owners and admins can review submissions." });

  const rows = await prisma.deliverableSubmission.findMany({
    where: { projectId: req.params.projectId },
    include: {
      user: { select: { id: true, name: true, avatarColor: true } },
      sources: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { submittedAt: "desc" },
  });

  res.json({ submissions: rows.map(serializeSubmission) });
});

submissionsRouter.patch("/projects/:projectId/submissions/:userId", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const membership = await getMembership(req.userId!, req.params.projectId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  if (!isAdmin) return res.status(403).json({ error: "Only owners and admins can review submissions." });

  const parsed = z
    .object({
      status: z.enum(["accepted", "revision_requested"]),
      reviewerNote: z.string().max(1000).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid review" });

  const updated = await prisma.deliverableSubmission.update({
    where: {
      projectId_userId: { projectId: req.params.projectId, userId: req.params.userId },
    },
    data: {
      status: parsed.data.status,
      reviewerNote: parsed.data.reviewerNote?.trim() ?? "",
      reviewedAt: new Date(),
    },
    include: {
      user: { select: { id: true, name: true, avatarColor: true } },
      sources: { orderBy: { createdAt: "asc" } },
    },
  });

  res.json({ submission: serializeSubmission(updated) });
});
