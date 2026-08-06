"use client";

import { useEffect, useRef, useState } from "react";
import {
  Brain,
  Briefcase,
  History,
  Inbox,
  Lightbulb,
  MoreHorizontal,
  Target,
  Users,
} from "lucide-react";

export function BoardToolsMenu({
  activityOpen,
  alignmentAttention,
  showAlignment,
  onTeam,
  onAlignment,
  onIdeas,
  onActivity,
  onInsights,
  onProjectField,
  onDeliverables,
  showDeliverables,
}: {
  activityOpen: boolean;
  alignmentAttention?: boolean;
  showAlignment?: boolean;
  onTeam: () => void;
  onAlignment?: () => void;
  onIdeas: () => void;
  onActivity: () => void;
  onInsights: () => void;
  onProjectField?: () => void;
  onDeliverables?: () => void;
  showDeliverables?: "admin" | "member";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function pick(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`btn-ghost relative px-2.5 py-1.5 ${open ? "border-white/25 bg-white/10" : ""}`}
        title="Team, alignment, ideas, and more"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">Tools</span>
        {alignmentAttention && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-ink-900" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-lg border border-white/10 bg-ink-900 py-1 shadow-xl">
          <MenuItem icon={Users} label="Team" onClick={() => pick(onTeam)} />
          {showAlignment && onAlignment && (
            <MenuItem
              icon={Target}
              label="Alignment"
              hint={alignmentAttention ? "Needs attention" : undefined}
              onClick={() => pick(onAlignment)}
            />
          )}
          {showDeliverables && onDeliverables && (
            <MenuItem
              icon={Inbox}
              label={showDeliverables === "admin" ? "Submissions inbox" : "My deliverables"}
              onClick={() => pick(onDeliverables)}
            />
          )}
          <MenuItem icon={Lightbulb} label="Ideas" onClick={() => pick(onIdeas)} />
          <MenuItem
            icon={History}
            label={activityOpen ? "Hide activity" : "Activity"}
            active={activityOpen}
            onClick={() => pick(onActivity)}
          />
          <MenuItem icon={Brain} label="AI insights" onClick={() => pick(onInsights)} />
          {onProjectField && (
            <>
              <div className="my-1 border-t border-white/10" />
              <MenuItem icon={Briefcase} label="Project field" onClick={() => pick(onProjectField)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  hint?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
        active ? "text-gray-100" : "text-gray-300"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[10px] text-amber-300">{hint}</span>}
    </button>
  );
}
