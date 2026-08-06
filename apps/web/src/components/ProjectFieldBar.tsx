"use client";

import { useState } from "react";
import { Briefcase, Check, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import { PROJECT_FIELDS, fieldLabel } from "@/lib/projectFields";
import { useAuth } from "@/store/auth";
import { useBoard } from "@/store/board";
import { toast } from "@/store/toast";

/** Project field picker — shown from Tools menu on the board. */
export function ProjectFieldBar({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const board = useBoard((s) => s.board);
  const applyServerBoard = useBoard((s) => s.applyServerBoard);
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);

  if (!board) return null;

  const field = board.project.field || "general";
  const myRole = board.members.find((m) => m.id === user?.id)?.role;
  const canEdit = myRole === "owner" || myRole === "admin";

  async function selectField(next: string) {
    if (!board || next === field) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      const { board: updated } = await api.updateProject(board.project.id, { field: next });
      applyServerBoard(updated);
      toast.success(`Project set to ${fieldLabel(next)}. Labels, filters, and alignment tracks now match that field.`);
      setOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't update field");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Briefcase className="h-3.5 w-3.5 text-gray-500" />
        <span className="text-xs text-gray-500">Project field</span>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-100 hover:bg-white/10"
            disabled={busy}
          >
            {fieldLabel(field)}
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        ) : (
          <span className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-gray-300">
            {fieldLabel(field)}
          </span>
        )}
      </div>

      {open && canEdit && (
        <div className="mt-2 grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
          {PROJECT_FIELDS.map((f) => {
            const selected = f.id === field;
            return (
              <button
                key={f.id}
                type="button"
                disabled={busy}
                onClick={() => void selectField(f.id)}
                className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                  selected
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 bg-ink-800/50 text-gray-300 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                <span>{f.label}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
      {open && (
        <p className="mt-2 text-[11px] text-gray-500">
          Changing field updates labels and filters for this institution. Existing columns stay as they
          are — rename them on the board if you need different stages.
        </p>
      )}
    </div>
  );
}
