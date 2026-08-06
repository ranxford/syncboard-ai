import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertCanManageTeam, assertMember, getMembership } from "../lib/access.js";
import { emitToProject } from "../realtime/io.js";
import { getBoardState } from "../lib/board.js";
import {
  alignmentEffectivenessSummary,
  buildAlignmentReport,
  filterAlignmentReportForViewer,
  listMemberAssignments,
} from "../lib/alignmentReport.js";
import { resolveMemberBrief, fieldAlignmentMeta } from "../lib/alignmentPositions.js";

export const alignmentRouter = Router();
alignmentRouter.use(requireAuth);

alignmentRouter.get("/projects/:projectId/alignment", async (req: AuthedRequest, res) => {
  try {
    await assertMember(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const projectId = req.params.projectId;
  const membership = await getMembership(req.userId!, projectId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  const built = await buildAlignmentReport(projectId);
  if (!built) return res.status(404).json({ error: "Project not found" });

  const report = filterAlignmentReportForViewer(built.report, req.userId!, isAdmin);

  const meta = fieldAlignmentMeta(built.projectField);

  res.json({
    alignment: report,
    projectField: meta.projectField,
    fieldLabel: meta.fieldLabel,
    positionTracks: meta.positionTracks,
    memberAssignments: isAdmin ? listMemberAssignments(built.projectField, built.memberships) : undefined,
    effectiveness: isAdmin ? alignmentEffectivenessSummary(built.report) : undefined,
    canManageRequirements: isAdmin,
  });
});

alignmentRouter.put("/projects/:projectId/requirements", async (req: AuthedRequest, res) => {
  try {
    await assertCanManageTeam(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const parsed = z
    .object({ requirements: z.string().max(4000) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid requirements" });

  await prisma.project.update({
    where: { id: req.params.projectId },
    data: { requirements: parsed.data.requirements.trim() },
  });

  const board = await getBoardState(req.params.projectId);
  if (board) emitToProject(req.params.projectId, "board:updated", { board });
  res.json({ ok: true, requirements: parsed.data.requirements.trim() });
});

const memberAssignmentSchema = z.object({
  userId: z.string().min(1),
  positionKey: z.string().max(40).optional(),
  positionLabel: z.string().max(120),
  assignedRequirements: z.string().max(4000),
});

alignmentRouter.put("/projects/:projectId/member-requirements", async (req: AuthedRequest, res) => {
  try {
    await assertCanManageTeam(req.userId!, req.params.projectId);
  } catch (e: any) {
    return res.status(e.status ?? 403).json({ error: e.message });
  }

  const parsed = z
    .object({ assignments: z.array(memberAssignmentSchema).max(50) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid assignments" });

  const projectId = req.params.projectId;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { field: true },
  });
  const projectField = project?.field ?? "general";

  const memberIds = new Set(
    (
      await prisma.membership.findMany({
        where: { projectId, role: "member" },
        select: { userId: true },
      })
    ).map((m) => m.userId),
  );

  for (const a of parsed.data.assignments) {
    if (!memberIds.has(a.userId)) {
      return res.status(400).json({ error: `User ${a.userId} is not a member-role collaborator` });
    }
    const resolved = resolveMemberBrief({
      field: projectField,
      positionKey: a.positionKey?.trim() ?? "",
      positionLabel: a.positionLabel,
      assignedRequirements: a.assignedRequirements,
    });
    await prisma.membership.update({
      where: { projectId_userId: { projectId, userId: a.userId } },
      data: {
        positionKey: resolved.positionKey,
        positionLabel: resolved.positionLabel,
        assignedRequirements: resolved.assignedRequirements,
      },
    });
  }

  res.json({ ok: true });
});
