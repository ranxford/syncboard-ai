"use client";

import { PhoneOff, X } from "lucide-react";
import { useSyncRoom } from "@/store/call";

/**
 * Always-on-top End/Close control for SyncRoom.
 * Lives outside the call panel so notes/whiteboard/minimize can never hide it.
 */
export function SyncRoomEndButton() {
  const phase = useSyncRoom((s) => s.phase);

  if (phase === "idle") return null;

  const inSession = phase === "in-call" || phase === "connecting";

  return (
    <button
      type="button"
      onClick={() => {
        const call = useSyncRoom.getState();
        if (call.phase === "in-call" || call.phase === "connecting") call.leave();
        else call.closeLobby();
      }}
      className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/40 ring-2 ring-white/20 hover:bg-red-500"
    >
      {inSession ? (
        <>
          <PhoneOff className="h-4 w-4" />
          End team session
        </>
      ) : (
        <>
          <X className="h-4 w-4" />
          Close SyncRoom
        </>
      )}
    </button>
  );
}
