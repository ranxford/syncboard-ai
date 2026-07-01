"use client";

import { Radio } from "lucide-react";
import { useBoard } from "@/store/board";
import { useAuth } from "@/store/auth";
import { useSyncRoom } from "@/store/call";

/** Suggests a spontaneous SyncRoom when teammates are on the same task. */
export function SyncRoomPresencePrompt({
  taskId,
  taskTitle,
}: {
  taskId: string;
  taskTitle: string;
}) {
  const presence = useBoard((s) => s.presence);
  const selfId = useAuth((s) => s.user?.id);
  const phase = useSyncRoom((s) => s.phase);

  const others = presence.filter((u) => u.userId !== selfId && u.focusedTaskId === taskId);
  if (others.length === 0 || phase !== "idle") return null;

  const names = others.map((u) => u.name).join(", ");

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-brand-100">
        <Radio className="mr-1.5 inline h-4 w-4" />
        <span className="font-medium">{names}</span>{" "}
        {others.length === 1 ? "is" : "are"} reviewing this task. Start a live discussion?
      </p>
      <button
        type="button"
        onClick={() => void useSyncRoom.getState().openLobby({ task: { id: taskId, title: taskTitle } })}
        className="btn-primary shrink-0 py-1.5 text-xs"
      >
        Start SyncRoom
      </button>
    </div>
  );
}
