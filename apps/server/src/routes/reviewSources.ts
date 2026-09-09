import { Router } from "express";
import multer from "multer";
import { createReadStream } from "node:fs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertMember, getMembership } from "../lib/access.js";
import { generateReviewBrief } from "../ai/reviewBrief.js";
import { reviewMemberCode } from "../ai/codeReview.js";
import { loadMemberReviewSources } from "../lib/loadReviewSources.js";
import {
  MAX_FILE_BYTES,
  classifyExternalUrl,
  classifyUploadedFile,
  deleteReviewFile,
  isAllowedMime,
  isAllowedUpload,
  reviewFilePath,
  saveReviewFile,
} from "../lib/reviewStorage.js";
import { serializeReviewSource } from "../lib/reviewSources.js";

export const reviewSourcesRouter = Router();
reviewSourcesRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

/** Member: draft + submitted sources for self. Admin: all sources for a member via query. */
reviewSourcesRouter.get("/projects/:projectId/review-sources", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const projectId = req.params.projectId;
  const membership = await getMembership(req.userId!, projectId);
  const targetUserId = String(req.query.userId ?? req.userId!);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  if (targetUserId !== req.userId && !isAdmin) {
    return res.status(403).json({ error: "Cannot view another member's review sources." });
  }

  const rows = await prisma.reviewSource.findMany({
    where: { projectId, userId: targetUserId },
    orderBy: { createdAt: "asc" },
  });

  res.json({ sources: rows.map((r) => serializeReviewSource(r)) });
});

const linkBody = z.object({
  url: z.string().url().max(2000),
  label: z.string().min(1).max(200),
  note: z.string().max(500).optional(),
});

reviewSourcesRouter.post("/projects/:projectId/review-sources/link", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const projectId = req.params.projectId;
  const membership = await getMembership(req.userId!, projectId);
  if (membership?.role !== "member") {
    return res.status(403).json({ error: "Only members attach review deliverables." });
  }

  const parsed = linkBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid link" });

  const kind = classifyExternalUrl(parsed.data.url);
  const row = await prisma.reviewSource.create({
    data: {
      projectId,
      userId: req.userId!,
      kind,
      label: parsed.data.label.trim(),
      externalUrl: parsed.data.url.trim(),
      note: parsed.data.note?.trim() ?? "",
    },
  });

  res.status(201).json({ source: serializeReviewSource(row) });
});

reviewSourcesRouter.post(
  "/projects/:projectId/review-sources/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: `File too large — max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB.`,
          });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) return next(err);
      next();
    });
  },
  async (req: AuthedRequest, res) => {
    try {
      await assertMember(req.userId!, req.params.projectId);
    } catch (e: any) {
      return res.status(e.status ?? 403).json({ error: e.message });
    }

    const projectId = req.params.projectId;
    const membership = await getMembership(req.userId!, projectId);
    if (membership?.role !== "member") {
      return res.status(403).json({ error: "Only members attach review deliverables." });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded." });
    if (!isAllowedUpload(file.mimetype, file.originalname)) {
      return res.status(400).json({
        error:
          "Unsupported file type. Use code (.ts, .py, .js, .md), DOCX, ZIP, PNG, JPG, PDF, WEBP, or SVG.",
      });
    }

    const label = String(req.body?.label ?? file.originalname).trim().slice(0, 200);
    const note = String(req.body?.note ?? "").trim().slice(0, 500);
    const kind = classifyUploadedFile(file.mimetype, file.originalname, label);
    const storageKey = await saveReviewFile(projectId, file.buffer, file.originalname);

    const row = await prisma.reviewSource.create({
      data: {
        projectId,
        userId: req.userId!,
        kind,
        label: label || file.originalname,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storageKey,
        note,
      },
    });

    res.status(201).json({ source: serializeReviewSource(row) });
  },
);

reviewSourcesRouter.delete("/projects/:projectId/review-sources/:sourceId", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const row = await prisma.reviewSource.findFirst({
    where: { id: req.params.sourceId, projectId: req.params.projectId },
  });
  if (!row) return res.status(404).json({ error: "Not found" });

  const membership = await getMembership(req.userId!, req.params.projectId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  if (row.userId !== req.userId && !isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (row.submissionId && row.userId !== req.userId) {
    return res.status(403).json({ error: "Cannot delete sources on a submitted deliverable." });
  }
  if (row.submissionId && row.userId === req.userId) {
    const sub = await prisma.deliverableSubmission.findUnique({ where: { id: row.submissionId } });
    if (sub && sub.status !== "revision_requested") {
      return res.status(400).json({ error: "Cannot remove sources while submission is pending review." });
    }
  }

  await deleteReviewFile(row.projectId, row.storageKey);
  await prisma.reviewSource.delete({ where: { id: row.id } });
  res.json({ ok: true });
});

reviewSourcesRouter.get(
  "/projects/:projectId/review-sources/:sourceId/file",
  async (req: AuthedRequest, res) => {
    try {
      await assertMember(req.userId!, req.params.projectId);
    } catch (e: any) {
      return res.status(e.status ?? 403).json({ error: e.message });
    }

    const row = await prisma.reviewSource.findFirst({
      where: { id: req.params.sourceId, projectId: req.params.projectId },
    });
    if (!row || !row.storageKey) return res.status(404).json({ error: "File not found" });

    res.setHeader("Content-Type", row.mimeType || "application/octet-stream");
    if (row.fileName) {
      res.setHeader("Content-Disposition", `inline; filename="${row.fileName.replace(/"/g, "")}"`);
    }
    createReadStream(reviewFilePath(row.projectId, row.storageKey)).pipe(res);
  },
);

/** Admin: NotebookLM-style brief over member submission + sources. */
reviewSourcesRouter.post(
  "/projects/:projectId/submissions/:userId/review-brief",
  async (req: AuthedRequest, res) => {
    try {
      await assertMember(req.userId!, req.params.projectId);
    } catch (e: any) {
      return res.status(e.status ?? 403).json({ error: e.message });
    }

    const membership = await getMembership(req.userId!, req.params.projectId);
    const isAdmin = membership?.role === "owner" || membership?.role === "admin";
    if (!isAdmin) return res.status(403).json({ error: "Only admins can generate review briefs." });

    const submission = await prisma.deliverableSubmission.findUnique({
      where: {
        projectId_userId: { projectId: req.params.projectId, userId: req.params.userId },
      },
      include: {
        user: { select: { name: true } },
        sources: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!submission) return res.status(404).json({ error: "No submission for this member." });

    const [project, memberShip] = await Promise.all([
      prisma.project.findUnique({
        where: { id: req.params.projectId },
        select: { requirements: true, field: true },
      }),
      prisma.membership.findUnique({
        where: {
          userId_projectId: { userId: req.params.userId, projectId: req.params.projectId },
        },
        select: { positionKey: true, positionLabel: true, assignedRequirements: true },
      }),
    ]);
    const sources = await loadMemberReviewSources(req.params.projectId, req.params.userId);
    const codeReview = project
      ? await reviewMemberCode({
          projectId: req.params.projectId,
          requirements: memberShip?.assignedRequirements ?? project.requirements,
          positionKey: memberShip?.positionKey ?? "",
          projectField: project.field,
          sources,
        })
      : null;

    const brief = generateReviewBrief({
      memberName: submission.user.name,
      positionLabel: memberShip?.positionLabel ?? "",
      assignedRequirements: memberShip?.assignedRequirements ?? "",
      projectRequirements: project?.requirements ?? "",
      alignmentScore: submission.alignmentScore,
      alignmentStatus: submission.alignmentStatus,
      memberSummary: submission.memberSummary,
      sources: submission.sources.map((s) => serializeReviewSource(s)),
      codeReview,
    });

    const updated = await prisma.deliverableSubmission.update({
      where: { id: submission.id },
      data: { reviewBrief: brief, reviewBriefAt: new Date() },
      include: { user: { select: { id: true, name: true, avatarColor: true } } },
    });

    res.json({ brief, submissionId: updated.id, generatedAt: updated.reviewBriefAt?.toISOString() });
  },
);
