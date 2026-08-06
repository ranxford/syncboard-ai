"use client";

import { LayoutList } from "lucide-react";
import { useSyncRoom } from "@/store/call";

/** Shown while a SyncRoom is active — board edits are recorded in the session timeline. */
export function SyncRoomBoardTracker() {
  const phase = useSyncRoom((s) => s.phase);
  const contextTask = useSyncRoom((s) => s.contextTask);

  if (phase !== "in-call") return null;

  return (
    <div className="flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200 md:px-6">
      <LayoutList className="h-3.5 w-3.5 shrink-0" />
      <span>
        <span className="font-medium text-emerald-100">Live workspace</span>
        {contextTask ? (
          <> — discussing “{contextTask.title}”. Card moves and edits are logged to the session replay.</>
        ) : (
          <> — card moves and edits during this SyncRoom are logged to the session replay.</>
        )}
      </span>
    </div>
  );
}
