"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Flag, Plus, Share2, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { Milestone, MemberTimeline } from "@/lib/types";
import { positionBadgeClass } from "@/lib/alignmentPositions";
import { useAuth } from "@/store/auth";
import { autoSubmitIfReady, isPersonalCloseoutMilestone } from "@/lib/submissionGate";
import { toast } from "@/store/toast";
import { Avatar } from "./Avatar";

type Tab = "community" | string; // string = userId

export function ProjectTimeline({ projectId }: { projectId: string }) {
  const user = useAuth((s) => s.user);

  const [community, setCommunity] = useState<Milestone[]>([]);
  const [communityPct, setCommunityPct] = useState(0);
  const [members, setMembers] = useState<MemberTimeline[]>([]);
  const [boardPct, setBoardPct] = useState(0);
  const [canManageCommunity, setCanManageCommunity] = useState(false);
  const [tab, setTab] = useState<Tab>("community");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function load() {
    const data = await api.getTimelines(projectId);
    setCommunity(data.community.milestones);
    setCommunityPct(data.community.progressPct);
    setMembers(data.members);
    setBoardPct(data.boardProgress.progressPct);
    setCanManageCommunity(data.canManageCommunity);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("syncboard:timeline-updated", { detail: { projectId } }),
      );
    }
  }

  useEffect(() => {
    void load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const mine = members.find((m) => m.isMe);
  const activeMember = tab === "community" ? null : members.find((m) => m.userId === tab);
  const activeMilestones = tab === "community" ? community : (activeMember?.milestones ?? []);
  const activePct = tab === "community" ? communityPct : (activeMember?.progressPct ?? 0);

  const canEdit =
    tab === "community"
      ? canManageCommunity
      : activeMember?.isMe || canManageCommunity;

  const onOwnPersonal = Boolean(activeMember?.isMe && tab !== "community");

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.createMilestone(projectId, {
        title: title.trim(),
        scope: tab === "community" ? "community" : "personal",
      });
      setTitle("");
      setAdding(false);
      toast.success(tab === "community" ? "Community milestone added." : "Added to your private timeline.");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't add milestone");
    }
  }

  async function cycleStatus(m: Milestone) {
    if (!canEdit) return;
    const next =
      m.status === "upcoming" ? "active" : m.status === "active" ? "done" : "upcoming";

    if (next === "done" && onOwnPersonal && isPersonalCloseoutMilestone(m.title)) {
      try {
        const { ready, readiness, submitted } = await autoSubmitIfReady(projectId);
        if (!ready) {
          const msg =
            readiness.blockers[0]?.message ??
            "AI check: your work does not meet the project standard yet.";
          toast.error(msg);
          return;
        }
        await api.updateMilestone(m.id, { status: next });
        await load();
        if (submitted) {
          toast.success("Wrapped up — submitted for admin review automatically.");
        } else {
          toast.success("Personal milestone marked done.");
        }
        return;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Could not complete wrap-up.");
        return;
      }
    }

    try {
      await api.updateMilestone(m.id, { status: next });
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't update milestone");
    }
  }

  async function shareToCommunity(m: Milestone) {
    setSharingId(m.id);
    try {
      await api.shareMilestoneToCommunity(m.id);
      toast.success(`“${m.title}” is now on the shared community timeline.`);
      setTab("community");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't share to community");
    } finally {
      setSharingId(null);
    }
  }

  return (
    <div className="border-b border-white/10 bg-white/[0.02] px-4 py-2 md:px-6">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 py-0.5 text-left"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Flag className="h-3.5 w-3.5 shrink-0 text-brand-300" />
          <span className="text-xs font-medium text-gray-300">Timelines</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-gray-400">
            Community {communityPct}%
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-gray-400">
            Board {boardPct}%
          </span>
          {!expanded && mine && (
            <span className="text-[10px] text-gray-500">· My track {mine.progressPct}%</span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
        )}
      </button>

      {expanded && (
        <>
      <div className="mb-2 mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {canEdit && (
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="btn-ghost px-2 py-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Milestone
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setTab("community")}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            tab === "community"
              ? "bg-white/15 text-gray-50 ring-1 ring-white/25"
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          <Users className="h-3 w-3" /> Shared community
          <span className="opacity-70">{communityPct}%</span>
        </button>
        {members.map((m) => (
          <button
            key={m.userId}
            type="button"
            onClick={() => setTab(m.userId)}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
              tab === m.userId
                ? "bg-white/15 text-gray-50 ring-1 ring-white/25"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
            title={
              m.isMe
                ? "Your private timeline — peers can’t see this until you share"
                : `${m.name}'s private timeline (admin only)`
            }
          >
            <Avatar name={m.name} color={m.avatarColor} size={16} />
            {m.isMe ? "My timeline" : m.name.split(" ")[0]}
            {m.positionKey && (
              <span
                className={`rounded px-1 py-0.5 text-[9px] ${positionBadgeClass(m.positionKey)}`}
              >
                {m.positionLabel || m.positionKey}
              </span>
            )}
            <span className="opacity-70">{m.progressPct}%</span>
          </button>
        ))}
      </div>

      <p className="mb-2 text-[11px] text-gray-500">
        {tab === "community"
          ? "Everyone in the community can see this track. Share personal work here when you’re ready."
          : activeMember?.isMe
            ? `Your private ${activeMember.positionLabel || "personal"} timeline — analyzer scores this track separately from other roles.`
            : canManageCommunity
              ? `Admin view: ${activeMember?.name}'s ${activeMember?.positionLabel || "personal"} timeline (scored separately).`
              : "Collaborator timeline."}
      </p>

      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-brand-gradient transition-all"
          style={{ width: `${activePct}%` }}
        />
      </div>

      {adding && canEdit && (
        <form onSubmit={(e) => void addMilestone(e)} className="mb-2 flex gap-2">
          <input
            className="input flex-1 py-1.5 text-sm"
            placeholder={tab === "community" ? "Community milestone" : "Personal milestone"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary py-1.5 text-xs">
            Add
          </button>
        </form>
      )}

      <ol className="flex flex-wrap gap-2">
        {activeMilestones.map((m, i) => (
          <li key={m.id} className="flex items-center gap-2">
            {i > 0 && <span className="hidden h-px w-4 bg-white/15 sm:block" />}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void cycleStatus(m)}
                disabled={!canEdit}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                  m.status === "done"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : m.status === "active"
                      ? "border-white/25 bg-white/10 text-gray-100"
                      : "border-white/10 bg-white/[0.02] text-gray-400"
                } ${canEdit ? "hover:border-white/30" : ""}`}
                title={canEdit ? "Click to cycle status" : m.description}
              >
                {m.status === "done" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Circle className={`h-3.5 w-3.5 ${m.status === "active" ? "fill-white/40" : ""}`} />
                )}
                <span className="font-medium">{m.title}</span>
                <span className="capitalize text-[10px] opacity-70">{m.status}</span>
              </button>
              {onOwnPersonal && (
                <button
                  type="button"
                  onClick={() => void shareToCommunity(m)}
                  disabled={sharingId === m.id}
                  className="rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-gray-400 hover:border-white/25 hover:text-gray-100"
                  title="Share this item to the community so all collaborators can see it"
                >
                  <Share2 className="inline h-3 w-3" /> Share
                </button>
              )}
            </div>
          </li>
        ))}
        {activeMilestones.length === 0 && (
          <li className="text-xs text-gray-500">No milestones yet.</li>
        )}
      </ol>

      {mine && tab === "community" && canManageCommunity && members.length > 1 && (
        <p className="mt-2 text-[11px] text-gray-500">
          As admin you can open each collaborator’s tab to oversee their private timeline. Peers only
          see what is shared to the community.
        </p>
      )}
      {mine && tab === mine.userId && !canManageCommunity && (
        <p className="mt-2 text-[11px] text-gray-500">
          Use <span className="text-gray-300">Share</span> on a milestone to publish it to the shared
          community track.
        </p>
      )}
        </>
      )}
    </div>
  );
}
