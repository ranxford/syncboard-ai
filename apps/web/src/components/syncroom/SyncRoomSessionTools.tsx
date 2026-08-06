"use client";

import { useState } from "react";
import { ChevronDown, Link2, Pencil, StickyNote } from "lucide-react";
import { SyncRoomNotes } from "./SyncRoomNotes";
import { SyncRoomWhiteboard } from "./SyncRoomWhiteboard";
import { SyncRoomArtifacts } from "./SyncRoomArtifacts";

type ToolTab = "notes" | "draw" | "links";

export function SyncRoomSessionTools() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ToolTab>("notes");

  return (
    <div className="border-t border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-gray-400 transition-colors hover:bg-white/[0.03] hover:text-gray-200"
      >
        <span>Session tools</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="flex gap-1 border-b border-white/10 px-2 pb-2">
            {(
              [
                ["notes", StickyNote, "Notes"],
                ["draw", Pencil, "Draw"],
                ["links", Link2, "Links"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  tab === id
                    ? "bg-brand-500/20 text-brand-200"
                    : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-300"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
          <div className="max-h-48 overflow-y-auto">
            {tab === "notes" && <SyncRoomNotes embedded />}
            {tab === "draw" && <SyncRoomWhiteboard forceOpen />}
            {tab === "links" && <SyncRoomArtifacts forceOpen />}
          </div>
        </>
      )}
    </div>
  );
}
