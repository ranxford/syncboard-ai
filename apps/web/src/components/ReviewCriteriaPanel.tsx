"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/store/toast";
import type { AlignmentTrack, MemberRoleAssignment } from "@/lib/types";
import {
  defaultCriteriaForKey,
  listPositionOptions,
  positionBadgeClass,
  positionLabelForKey,
} from "@/lib/alignmentPositions";

/** Admin sets project + per-member/role criteria used by the review gate. */
export function ReviewCriteriaPanel({
  projectId,
  requirements: initialReq,
}: {
  projectId: string;
  requirements: string;
}) {
  const [requirements, setRequirements] = useState(initialReq);
  const [assignments, setAssignments] = useState<MemberRoleAssignment[]>([]);
  const [positionTracks, setPositionTracks] = useState<AlignmentTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRequirements(initialReq);
  }, [initialReq]);

  useEffect(() => {
    void api
      .getAlignment(projectId)
      .then((res) => {
        if (res.memberAssignments) setAssignments(res.memberAssignments);
        if (res.positionTracks) setPositionTracks(res.positionTracks);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  function updateAssignment(index: number, patch: Partial<MemberRoleAssignment>) {
    setAssignments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function onRoleChange(index: number, positionKey: string) {
    const a = assignments[index];
    const label = positionLabelForKey(positionTracks, positionKey, a.positionLabel);
    const prefilled =
      a.assignedRequirements.trim() ||
      defaultCriteriaForKey(positionTracks, positionKey);
    updateAssignment(index, {
      positionKey,
      positionLabel: label,
      assignedRequirements: prefilled,
    });
  }

  async function save() {
    setSaving(true);
    try {
      await api.updateRequirements(projectId, requirements);
      if (assignments.length > 0) {
        await api.updateMemberRequirements(
          projectId,
          assignments.map((a) => ({
            userId: a.userId,
            positionKey: a.positionKey,
            positionLabel: positionLabelForKey(positionTracks, a.positionKey, a.positionLabel),
            assignedRequirements: a.assignedRequirements,
          })),
        );
      }
      toast.success("Review criteria saved — members will be notified.");
      setRequirements("");
      setAssignments((prev) =>
        prev.map((a) => ({ ...a, assignedRequirements: "" })),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not save criteria.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-gray-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading criteria…
      </div>
    );
  }

  const roleOptions = listPositionOptions(positionTracks);

  return (
    <div className="space-y-3 border-t border-brand-500/20 pt-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-brand-300/80">
          Project requirements (admin brief)
        </label>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          rows={3}
          className="input w-full text-xs"
          placeholder="Overall project goals the review gate checks against…"
        />
      </div>
      {assignments.map((a, i) => (
        <div key={a.userId} className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-gray-300">{a.name}</span>
            <select
              value={a.positionKey || ""}
              onChange={(e) => onRoleChange(i, e.target.value)}
              className="input max-w-[180px] py-1 text-[11px]"
            >
              <option value="">Select role…</option>
              {roleOptions.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            {a.positionKey && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] ${positionBadgeClass(a.positionKey, positionTracks)}`}
              >
                {positionLabelForKey(positionTracks, a.positionKey, a.positionLabel)}
              </span>
            )}
          </div>
          <textarea
            value={a.assignedRequirements}
            onChange={(e) => updateAssignment(i, { assignedRequirements: e.target.value })}
            rows={2}
            className="input w-full text-xs"
            placeholder={
              a.positionKey
                ? "Criteria for this member's role and deliverables…"
                : "Pick a role above, then add criteria for this member…"
            }
          />
        </div>
      ))}
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="btn-ghost w-full text-xs"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save review criteria
      </button>
    </div>
  );
}
