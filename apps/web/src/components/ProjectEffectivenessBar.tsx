"use client";

import { AlertTriangle } from "lucide-react";
import type { AlignmentEffectiveness } from "@/lib/types";

export function ProjectEffectivenessBar({
  isAdmin,
  effectiveness,
  myStatus,
  onOpenAlignment,
}: {
  isAdmin: boolean;
  effectiveness: AlignmentEffectiveness | null;
  myStatus: string | null;
  onOpenAlignment?: () => void;
}) {
  const adminNeedsAction =
    isAdmin &&
    effectiveness &&
    (effectiveness.needsBrief || effectiveness.offTrack > 0 || effectiveness.drifting > 0);

  const memberNeedsAction =
    !isAdmin && (myStatus === "off_track" || myStatus === "drifting");

  if (!adminNeedsAction && !memberNeedsAction) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-2 text-sm md:px-6">
      <div className="flex items-start gap-2 text-amber-100/90">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div>
          {isAdmin && effectiveness?.needsBrief && (
            <p>
              <span className="font-medium text-amber-200">Publish requirements</span> so the team
              can stay aligned with your brief.
            </p>
          )}
          {isAdmin && effectiveness && !effectiveness.needsBrief && (
            <p>
              <span className="font-medium text-amber-200">Alignment check:</span>{" "}
              {effectiveness.offTrack > 0 && <span>{effectiveness.offTrack} off track</span>}
              {effectiveness.offTrack > 0 && effectiveness.drifting > 0 && ", "}
              {effectiveness.drifting > 0 && <span>{effectiveness.drifting} drifting</span>}
              {effectiveness.offTrack === 0 && effectiveness.drifting === 0 && (
                <span>review scores in Alignment</span>
              )}
            </p>
          )}
          {!isAdmin && memberNeedsAction && (
            <p>
              Your current work looks{" "}
              <span className="font-medium text-amber-200">
                {myStatus === "off_track" ? "off track" : "drifting"}
              </span>{" "}
              vs the project standard — see the <span className="text-gray-300">AI review check</span>{" "}
              bar below for live feedback.
            </p>
          )}
        </div>
      </div>
      {isAdmin && onOpenAlignment && (
        <button
          type="button"
          onClick={onOpenAlignment}
          className="shrink-0 text-xs text-amber-200/80 underline-offset-2 hover:underline"
        >
          Open in Tools → Alignment
        </button>
      )}
    </div>
  );
}

export function alignmentNeedsAttention(
  isAdmin: boolean,
  effectiveness: AlignmentEffectiveness | null,
  myStatus: string | null,
): boolean {
  if (isAdmin && effectiveness) {
    return (
      effectiveness.needsBrief || effectiveness.offTrack > 0 || effectiveness.drifting > 0
    );
  }
  return myStatus === "off_track" || myStatus === "drifting";
}
