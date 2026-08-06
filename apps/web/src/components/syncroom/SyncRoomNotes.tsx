"use client";

import { useEffect, useRef, useState } from "react";
import { StickyNote } from "lucide-react";
import { useSyncRoom } from "@/store/call";

/** Live notes shared across everyone in the SyncRoom — included in AI wrap-up. */
export function SyncRoomNotes({ embedded = false }: { embedded?: boolean }) {
  const phase = useSyncRoom((s) => s.phase);
  const remoteNotes = useSyncRoom((s) => s.collaborativeNotes);
  const setCollaborativeNotes = useSyncRoom((s) => s.setCollaborativeNotes);
  const [local, setLocal] = useState(remoteNotes);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(remoteNotes);
  }, [remoteNotes]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (phase !== "in-call") return null;

  return (
    <div className={embedded ? "px-3 py-2" : "border-t border-white/10 bg-white/[0.02] px-3 py-2"}>
      {!embedded && (
        <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          <StickyNote className="h-3 w-3" /> Live notes
        </label>
      )}
      <textarea
        className="input min-h-[56px] resize-y text-xs"
        placeholder="Capture decisions, blockers, and context as you talk…"
        value={local}
        onChange={(e) => {
          const value = e.target.value;
          setLocal(value);
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => setCollaborativeNotes(value), 450);
        }}
      />
    </div>
  );
}
