"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Target, UserPlus, X } from "lucide-react";
import { api } from "@/lib/api";
import type {
  AlignmentReport,
  AlignmentTrack,
  CollaboratorAlignment,
  MemberRoleAssignment,
} from "@/lib/types";
import {
  defaultCriteriaForKey,
  groupCollaboratorsByTrack,
  listPositionOptions,
  positionBadgeClass,
  positionLabelForKey,
  trackSummaryLabels,
} from "@/lib/alignmentPositions";
import { fieldLabel as projectFieldLabel } from "@/lib/projectFields";
import { useAuth } from "@/store/auth";
import { useBoard } from "@/store/board";
import { toast } from "@/store/toast";
import { Avatar } from "./Avatar";
import { SubmitDeliverableSection } from "./SubmitDeliverableSection";

function statusStyle(status: CollaboratorAlignment["status"]) {
  if (status === "aligned") return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
  if (status === "drifting") return "text-amber-300 border-amber-500/30 bg-amber-500/10";
  if (status === "off_track") return "text-red-300 border-red-500/30 bg-red-500/10";
  return "text-gray-400 border-white/10 bg-white/5";
}

function HowItWorks({ isAdmin, fieldLabel, trackLabels }: { isAdmin: boolean; fieldLabel: string; trackLabels: string }) {
  return (
    <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-gray-400">
      <p className="mb-2 font-medium text-gray-300">How the analyzer works</p>
      <ol className="list-decimal space-y-1.5 pl-4">
        {isAdmin ? (
          <>
            <li>
              Set a <span className="text-gray-300">project standard</span> for this{" "}
              <span className="text-gray-300">{fieldLabel}</span> project.
            </li>
            <li>
              Search by <span className="text-gray-300">name, email, or member ID</span>, or use{" "}
              <span className="text-gray-300">Assign by name</span> on each track column.
            </li>
            <li>
              In <span className="text-gray-300">Position roster</span>, assign Members to{" "}
              <span className="text-gray-300">{trackLabels}</span> — tracks match this field.
            </li>
            <li>
              AI scores only that person&apos;s assigned tasks and{" "}
              <span className="text-gray-300">personal timeline</span> (no cross-role mixing).
            </li>
            <li>
              Members can only submit after the analyzer confirms they meet their track criteria (≥60%,
              no off-track tasks).
            </li>
          </>
        ) : (
          <>
            <li>The admin assigns criteria for your role; you do not write feedback manually.</li>
            <li>AI reviews your tasks and timeline against your assigned criteria.</li>
            <li>AI runs continuously on the board — no refresh or typing from members.</li>
            <li>
              When ready, click <span className="text-gray-300">Submit for review</span> or mark{" "}
              <span className="text-gray-300">Wrapped up</span> on your timeline.
            </li>
          </>
        )}
      </ol>
    </div>
  );
}

function PositionBadge({
  positionKey,
  label,
  tracks,
}: {
  positionKey: string;
  label?: string;
  tracks: AlignmentTrack[];
}) {
  if (!positionKey) return null;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${positionBadgeClass(positionKey, tracks)}`}
    >
      {label || positionLabelForKey(tracks, positionKey)}
    </span>
  );
}

function memberMatchesQuery(a: MemberRoleAssignment, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    a.name.toLowerCase().includes(q) ||
    a.email.toLowerCase().includes(q) ||
    a.userId.toLowerCase().includes(q)
  );
}

function shortMemberId(userId: string) {
  return userId.slice(-6);
}

function buildTrackAssignment(
  tracks: AlignmentTrack[],
  trackKey: string,
  customLabel = "",
): Partial<MemberRoleAssignment> {
  if (trackKey === "custom") {
    return { positionKey: "custom", positionLabel: customLabel };
  }
  if (!trackKey) {
    return { positionKey: "", positionLabel: "", assignedRequirements: "" };
  }
  return {
    positionKey: trackKey,
    positionLabel: positionLabelForKey(tracks, trackKey),
    assignedRequirements: defaultCriteriaForKey(tracks, trackKey),
  };
}

function PositionRoster({
  assignments,
  tracks,
  onAssignToTrack,
}: {
  assignments: MemberRoleAssignment[];
  tracks: AlignmentTrack[];
  onAssignToTrack: (userId: string, trackKey: string) => void;
}) {
  const unassigned = assignments.filter((a) => !a.positionKey);

  return (
    <div className={`mb-3 grid gap-2 ${tracks.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {tracks.map((track) => {
        const people = assignments.filter((a) => a.positionKey === track.key);
        return (
          <div key={track.key} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
            <p className="mb-1.5">
              <PositionBadge positionKey={track.key} label={track.label} tracks={tracks} />
            </p>
            {people.length === 0 ? (
              <p className="mb-2 text-[10px] text-gray-600">No one assigned</p>
            ) : (
              <ul className="mb-2 space-y-1">
                {people.map((p) => (
                  <li key={p.userId} className="flex items-center gap-1.5 text-[11px] text-gray-300">
                    <Avatar name={p.name} color={p.avatarColor} size={18} />
                    <span className="min-w-0 truncate" title={p.email}>
                      {p.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {assignments.length > 0 && (
              <select
                className="input w-full py-1 text-[11px]"
                value=""
                onChange={(e) => {
                  const userId = e.target.value;
                  if (userId) onAssignToTrack(userId, track.key);
                }}
                aria-label={`Assign member to ${track.label}`}
              >
                <option value="">+ Assign by name…</option>
                {unassigned.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {p.name} · {p.email}
                  </option>
                ))}
                {people.map((p) => (
                  <option key={`move-${p.userId}`} value={p.userId} disabled>
                    {p.name} (already here)
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CollaboratorAssignSearch({
  assignments,
  tracks,
  selectedUserId,
  onSelect,
  onAssign,
}: {
  assignments: MemberRoleAssignment[];
  tracks: AlignmentTrack[];
  selectedUserId: string | null;
  onSelect: (userId: string | null) => void;
  onAssign: (userId: string, trackKey: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => assignments.filter((a) => memberMatchesQuery(a, query)),
    [assignments, query],
  );
  const positionOptions = listPositionOptions(tracks);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="mb-2 text-[11px] font-medium text-gray-400">Assign by name or email</p>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        <input
          className="input w-full py-1.5 pl-8 text-sm"
          placeholder="Search name, email, or member ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-gray-500">No members match “{query.trim()}”.</p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {filtered.map((a) => {
            const selected = selectedUserId === a.userId;
            return (
              <li
                key={a.userId}
                className={`rounded-lg border p-2 transition-colors ${
                  selected
                    ? "border-brand-500/40 bg-brand-500/10"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <button
                  type="button"
                  className="mb-2 flex w-full items-start gap-2 text-left"
                  onClick={() => onSelect(selected ? null : a.userId)}
                >
                  <Avatar name={a.name} color={a.avatarColor} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-100">{a.name}</p>
                    <p className="truncate text-[11px] text-gray-500">{a.email}</p>
                    <p className="text-[10px] text-gray-600">ID …{shortMemberId(a.userId)}</p>
                  </div>
                  {a.positionKey ? (
                    <PositionBadge positionKey={a.positionKey} label={a.positionLabel} tracks={tracks} />
                  ) : (
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-gray-500">
                      Unassigned
                    </span>
                  )}
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="input max-w-[10rem] py-1 text-[11px]"
                    value={a.positionKey || ""}
                    onChange={(e) => onAssign(a.userId, e.target.value)}
                    aria-label={`Assign track for ${a.name}`}
                  >
                    <option value="">Unassigned</option>
                    {positionOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CollaboratorCard({ c, tracks }: { c: CollaboratorAlignment; tracks: AlignmentTrack[] }) {
  return (
    <li className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar name={c.name} color={c.avatarColor} size={32} />
          <div>
            <p className="font-medium text-gray-100">{c.name}</p>
            <p className="text-[11px] text-gray-500">{c.userId ? `Member …${shortMemberId(c.userId)}` : c.role}</p>
            {c.positionKey && (
              <div className="mt-0.5">
                <PositionBadge positionKey={c.positionKey} label={c.positionLabel} tracks={tracks} />
              </div>
            )}
          </div>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusStyle(c.status)}`}
        >
          {c.status.replace("_", " ")} · {c.score}%
        </span>
      </div>
      {c.assignedRequirements && (
        <p className="mb-2 rounded-md border border-white/10 bg-white/[0.03] p-2 text-[11px] text-gray-500">
          <span className="font-medium text-gray-400">Role criteria: </span>
          {c.assignedRequirements.slice(0, 200)}
          {c.assignedRequirements.length > 200 ? "…" : ""}
        </p>
      )}
      <p className="mb-2 text-sm text-gray-400">{c.aiFeedback ?? c.summary}</p>
      {c.aiSuggestions && c.aiSuggestions.length > 0 && (
        <ul className="mb-2 list-disc space-y-1 pl-4 text-[11px] text-brand-200/90">
          {c.aiSuggestions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
      {c.missingThemes.length > 0 && (
        <p className="mb-1 text-[11px] text-gray-500">
          <span className="text-gray-400">Gaps:</span> {c.missingThemes.join(", ")}
        </p>
      )}
      {c.offTrackTasks.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-white/10 pt-2 text-xs text-amber-200/90">
          {c.offTrackTasks.map((t) => (
            <li key={t.id}>
              “{t.title}” — {t.reason}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] text-gray-600">
        Scored from {c.workSampleCount} item{c.workSampleCount === 1 ? "" : "s"} on their assigned
        tasks and personal timeline only.
      </p>
    </li>
  );
}

function MemberAssignmentEditor({
  assignment,
  tracks,
  onChange,
}: {
  assignment: MemberRoleAssignment;
  tracks: AlignmentTrack[];
  onChange: (patch: Partial<MemberRoleAssignment>) => void;
}) {
  const positionOptions = listPositionOptions(tracks);

  function selectPosition(key: string) {
    onChange(buildTrackAssignment(tracks, key, assignment.positionLabel));
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={assignment.name} color={assignment.avatarColor} size={28} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-200">{assignment.name}</p>
            <p className="truncate text-[11px] text-gray-500">{assignment.email}</p>
            <p className="text-[10px] text-gray-600">Member ID …{shortMemberId(assignment.userId)}</p>
          </div>
        </div>
        {assignment.positionKey && (
          <PositionBadge positionKey={assignment.positionKey} label={assignment.positionLabel} tracks={tracks} />
        )}
      </div>
      <label className="mb-1 block text-[11px] font-medium text-gray-500">Position track</label>
      <select
        className="input mb-2 py-1.5 text-sm"
        value={assignment.positionKey || ""}
        onChange={(e) => selectPosition(e.target.value)}
      >
        <option value="">Unassigned</option>
        {positionOptions.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
      {assignment.positionKey === "custom" && (
        <>
          <label className="mb-1 block text-[11px] font-medium text-gray-500">Custom role title</label>
          <input
            className="input mb-2 py-1.5 text-sm"
            placeholder="e.g. DevOps, QA lead"
            value={assignment.positionLabel}
            onChange={(e) => onChange({ positionLabel: e.target.value })}
          />
        </>
      )}
      <label className="mb-1 block text-[11px] font-medium text-gray-500">
        Track criteria (analyzer checks their timeline separately)
      </label>
      <textarea
        className="input min-h-[72px] resize-y text-sm"
        placeholder="What this person must deliver on their personal timeline and assigned tasks…"
        value={assignment.assignedRequirements}
        onChange={(e) => onChange({ assignedRequirements: e.target.value })}
        disabled={!assignment.positionKey}
      />
      {!assignment.positionKey && (
        <p className="mt-1 text-[10px] text-gray-600">
          Pick a track for this {tracks.length ? "project field" : "project"} to apply analyzer criteria.
        </p>
      )}
    </div>
  );
}

export function ProjectAlignmentPanel({
  projectId,
  open,
  onClose,
  onSaved,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const user = useAuth((s) => s.user);
  const board = useBoard((s) => s.board);
  const applyServerBoard = useBoard((s) => s.applyServerBoard);
  const myRole = board?.members.find((m) => m.id === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  const [report, setReport] = useState<AlignmentReport | null>(null);
  const [assignments, setAssignments] = useState<MemberRoleAssignment[]>([]);
  const [positionTracks, setPositionTracks] = useState<AlignmentTrack[]>([]);
  const [alignmentFieldLabel, setAlignmentFieldLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [requirements, setRequirements] = useState("");
  const [savingBrief, setSavingBrief] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { alignment, memberAssignments, positionTracks: tracks, fieldLabel } =
        await api.getAlignment(projectId);
      setReport(alignment);
      if (memberAssignments) setAssignments(memberAssignments);
      if (tracks) setPositionTracks(tracks);
      setAlignmentFieldLabel(fieldLabel ?? projectFieldLabel(board?.project.field));
    } finally {
      setLoading(false);
    }
  }, [projectId, board?.project.field]);

  const fieldLabel =
    alignmentFieldLabel || projectFieldLabel(board?.project.field) || "General / Other";
  const trackLabels = trackSummaryLabels(positionTracks);

  useEffect(() => {
    if (!open) return;
    setRequirements(board?.project.requirements ?? "");
    void load();
  }, [open, projectId, board?.project.requirements, load]);

  if (!open) return null;

  async function saveRequirements(e: React.FormEvent) {
    e.preventDefault();
    setSavingBrief(true);
    try {
      await api.updateRequirements(projectId, requirements.trim());
      toast.success("Project standard saved.");
      const fresh = await api.getBoard(projectId);
      applyServerBoard(fresh.board);
      await load();
      onSaved?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't save requirements");
    } finally {
      setSavingBrief(false);
    }
  }

  async function saveAssignments(e: React.FormEvent) {
    e.preventDefault();
    setSavingAssignments(true);
    try {
      await api.updateMemberRequirements(
        projectId,
        assignments.map((a) => ({
          userId: a.userId,
          positionKey: a.positionKey,
          positionLabel: a.positionLabel.trim(),
          assignedRequirements: a.assignedRequirements.trim(),
        })),
      );
      toast.success("Role assignments saved — analyzer updated.");
      await load();
      onSaved?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't save assignments");
    } finally {
      setSavingAssignments(false);
    }
  }

  function assignMemberToTrack(userId: string, trackKey: string) {
    const member = assignments.find((a) => a.userId === userId);
    patchAssignment(
      userId,
      buildTrackAssignment(positionTracks, trackKey, member?.positionLabel ?? ""),
    );
    setSelectedMemberId(userId);
  }

  function patchAssignment(userId: string, patch: Partial<MemberRoleAssignment>) {
    setAssignments((prev) =>
      prev.map((a) => (a.userId === userId ? { ...a, ...patch } : a)),
    );
  }

  const selectedAssignment = assignments.find((a) => a.userId === selectedMemberId) ?? null;
  const detailAssignments = selectedAssignment ? [selectedAssignment] : assignments;

  const isAdminView = canManage;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-ink-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-gray-50">
              <Target className="h-4 w-4 text-brand-400" /> Project alignment
            </h2>
            <p className="text-xs text-gray-500">
              {isAdminView
                ? `${fieldLabel} project — assign field-specific tracks; AI coaches each member separately.`
                : "AI feedback on how your work matches your assigned role criteria."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <HowItWorks isAdmin={isAdminView} fieldLabel={fieldLabel} trackLabels={trackLabels} />

          {canManage && (
            <div className="space-y-4 border-b border-white/10 p-4">
              <form onSubmit={(e) => void saveRequirements(e)} className="space-y-2">
                <label className="text-xs font-medium text-gray-400">
                  1. Project standard (fallback when a track has no specific criteria)
                </label>
                <textarea
                  className="input min-h-[80px] resize-y text-sm"
                  placeholder="Overall outcomes every collaborator should reflect…"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                />
                <button type="submit" disabled={savingBrief} className="btn-primary py-1.5 text-xs">
                  {savingBrief ? "Saving…" : "Save project standard"}
                </button>
              </form>

              <form onSubmit={(e) => void saveAssignments(e)} className="space-y-3 rounded-xl border border-brand-500/20 bg-brand-500/[0.04] p-4">
                <div>
                  <p className="text-sm font-medium text-gray-100">2. Position roster · {fieldLabel}</p>
                  <p className="text-[11px] text-gray-500">
                    Assign Members to {trackLabels}. Each person&apos;s analyzer runs on their own tasks
                    and personal timeline — no cross-track mixing.
                  </p>
                </div>

                <PositionRoster
                  assignments={assignments}
                  tracks={positionTracks}
                  onAssignToTrack={assignMemberToTrack}
                />

                {assignments.length > 0 && (
                  <CollaboratorAssignSearch
                    assignments={assignments}
                    tracks={positionTracks}
                    selectedUserId={selectedMemberId}
                    onSelect={setSelectedMemberId}
                    onAssign={assignMemberToTrack}
                  />
                )}

                {assignments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-4 text-sm text-gray-400">
                    <p className="mb-1 font-medium text-gray-300">No Members to assign yet</p>
                    <p className="text-xs">
                      Invite collaborators as <span className="text-gray-300">Member</span> in Team
                      (not Admin). Owners and admins set tracks; only Members are scored by the
                      analyzer.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium text-gray-400">
                        <UserPlus className="mr-1 inline h-3.5 w-3.5" />
                        {selectedAssignment
                          ? `Criteria for ${selectedAssignment.name}`
                          : "Track criteria per member"}
                      </p>
                      {selectedAssignment && (
                        <button
                          type="button"
                          className="btn-ghost py-0.5 text-[10px]"
                          onClick={() => setSelectedMemberId(null)}
                        >
                          Show all
                        </button>
                      )}
                    </div>
                    {detailAssignments.map((a) => (
                      <MemberAssignmentEditor
                        key={a.userId}
                        assignment={a}
                        tracks={positionTracks}
                        onChange={(patch) => patchAssignment(a.userId, patch)}
                      />
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={savingAssignments || assignments.length === 0}
                    className="btn-primary py-1.5 text-xs disabled:opacity-40"
                  >
                    {savingAssignments ? "Saving…" : "Save position roster"}
                  </button>
                  <button type="button" onClick={() => void load()} className="btn-ghost py-1.5 text-xs">
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh analysis
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="p-4">
            {!canManage && report?.hasBrief && (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className="btn-ghost py-1.5 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh my score
                </button>
              </div>
            )}
            {canManage && (
              <p className="mb-3 text-xs font-medium text-gray-400">3. Track analysis</p>
            )}
            {loading && <p className="text-sm text-gray-500">Analyzing alignment…</p>}
            {!loading && report && !report.hasBrief && (
              <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-400">
                {canManage
                  ? "Save a project standard or assign track criteria above so the analyzer can score collaborators."
                  : "Your project manager hasn’t assigned criteria for your role yet."}
              </p>
            )}
            {!loading && !canManage && <SubmitDeliverableSection projectId={projectId} />}
            {!loading && report?.hasBrief && (
              <>
                {!canManage && report.collaborators[0]?.assignedRequirements && (
                  <p className="mb-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-gray-400">
                    {report.collaborators[0].positionLabel && (
                      <span className="font-medium text-gray-300">
                        {report.collaborators[0].positionLabel}:{" "}
                      </span>
                    )}
                    {report.collaborators[0].assignedRequirements.slice(0, 280)}
                    {report.collaborators[0].assignedRequirements.length > 280 ? "…" : ""}
                  </p>
                )}
                {canManage && report.collaborators.length === 0 && (
                  <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-400">
                    Assign Members to {trackLabels} above, then refresh. Analysis appears here grouped
                    by track.
                  </p>
                )}
                {canManage && report.collaborators.length > 0 && (
                  <div className="space-y-4">
                    {groupCollaboratorsByTrack(report.collaborators, positionTracks).map((group) => (
                      <div key={group.key || "unassigned"}>
                        <p className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-400">
                          {group.track ? (
                            <PositionBadge
                              positionKey={group.track.key}
                              label={group.track.label}
                              tracks={positionTracks}
                            />
                          ) : null}
                          {group.label}
                        </p>
                        <ul className="space-y-3">
                          {group.collaborators.map((c) => (
                            <CollaboratorCard
                              key={c.userId}
                              c={c as CollaboratorAlignment}
                              tracks={positionTracks}
                            />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
