"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/store/toast";
import type { MemberRoleAssignment } from "@/lib/types";

/** Admin sets project + per-member criteria used by DeepSeek review gate. */
export function ReviewCriteriaPanel({
  projectId,
  requirements: initialReq,
}: {
  projectId: string;
  requirements: string;
}) {
  const [requirements, setRequirements] = useState(initialReq);
  const [assignments, setAssignments] = useState<MemberRoleAssignment[]>([]);
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
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

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
            positionLabel: a.positionLabel,
            assignedRequirements: a.assignedRequirements,
          })),
        );
      }
      toast.success("Review criteria saved — DeepSeek will use these in the Review gate.");
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

  return (
    <div className="space-y-3 border-t border-violet-500/20 pt-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-violet-300/80">
          Project requirements (admin brief)
        </label>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          rows={3}
          className="input w-full text-xs"
          placeholder="Overall project goals DeepSeek checks against…"
        />
      </div>
      {assignments.map((a, i) => (
        <div key={a.userId}>
          <label className="mb-1 block text-[11px] text-gray-400">
            {a.name} — {a.positionLabel || "Member"}
          </label>
          <textarea
            value={a.assignedRequirements}
            onChange={(e) => {
              const next = [...assignments];
              next[i] = { ...a, assignedRequirements: e.target.value };
              setAssignments(next);
            }}
            rows={2}
            className="input w-full text-xs"
            placeholder="Criteria for this member's deliverables…"
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
