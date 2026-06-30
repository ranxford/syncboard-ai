"use client";

import { Filter, X } from "lucide-react";
import type { Member, Priority } from "@/lib/types";
import { PRIORITY_STYLES } from "@/lib/ui";

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

export interface BoardFilterState {
  labels: string[];
  assigneeId: string | null; // null = anyone, "unassigned" sentinel, otherwise a user id
  priorities: Priority[];
}

export const EMPTY_FILTERS: BoardFilterState = { labels: [], assigneeId: null, priorities: [] };

export function isFilterActive(f: BoardFilterState): boolean {
  return f.labels.length > 0 || f.assigneeId !== null || f.priorities.length > 0;
}

// ── URL (de)serialization so filters survive reload and are shareable ──
export function filtersToSearch(f: BoardFilterState): string {
  const p = new URLSearchParams();
  if (f.labels.length) p.set("labels", f.labels.join(","));
  if (f.priorities.length) p.set("priority", f.priorities.join(","));
  if (f.assigneeId) p.set("assignee", f.assigneeId);
  return p.toString();
}

export function filtersFromSearch(search: string): BoardFilterState {
  const p = new URLSearchParams(search);
  const labels = (p.get("labels") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const priorities = (p.get("priority") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is Priority => (PRIORITIES as string[]).includes(s));
  const assignee = p.get("assignee");
  return { labels, priorities, assigneeId: assignee || null };
}

export function BoardFilters({
  allLabels,
  members,
  currentUserId,
  filters,
  onChange,
  shown,
  total,
}: {
  allLabels: string[];
  members: Member[];
  currentUserId?: string;
  filters: BoardFilterState;
  onChange: (next: BoardFilterState) => void;
  shown: number;
  total: number;
}) {
  const active = isFilterActive(filters);

  function toggleLabel(label: string) {
    const has = filters.labels.includes(label);
    onChange({
      ...filters,
      labels: has ? filters.labels.filter((l) => l !== label) : [...filters.labels, label],
    });
  }

  function togglePriority(priority: Priority) {
    const has = filters.priorities.includes(priority);
    onChange({
      ...filters,
      priorities: has
        ? filters.priorities.filter((p) => p !== priority)
        : [...filters.priorities, priority],
    });
  }

  if (allLabels.length === 0 && members.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 px-4 py-2 md:px-6">
      <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
        <Filter className="h-3.5 w-3.5" /> Filter
      </span>

      <div className="flex flex-wrap items-center gap-1.5">
        {PRIORITIES.map((p) => {
          const on = filters.priorities.includes(p);
          const style = PRIORITY_STYLES[p];
          return (
            <button
              key={p}
              onClick={() => togglePriority(p)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                on ? "bg-white/15 text-white ring-1 ring-white/30" : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
              aria-pressed={on}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
              {style.label}
            </button>
          );
        })}
      </div>

      {allLabels.length > 0 && <span className="h-4 w-px bg-white/10" aria-hidden />}

      <div className="flex flex-wrap items-center gap-1.5">
        {allLabels.map((label) => {
          const on = filters.labels.includes(label);
          return (
            <button
              key={label}
              onClick={() => toggleLabel(label)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                on ? "bg-brand-500 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
              aria-pressed={on}
            >
              {label}
            </button>
          );
        })}
      </div>

      {members.length > 0 && (
        <select
          value={filters.assigneeId ?? ""}
          onChange={(e) =>
            onChange({ ...filters, assigneeId: e.target.value === "" ? null : e.target.value })
          }
          className="rounded-md border border-white/10 bg-ink-800 px-2 py-1 text-xs text-gray-200 focus:border-brand-500 focus:outline-none"
          title="Filter by assignee"
        >
          <option value="">Anyone</option>
          {currentUserId && <option value={currentUserId}>Assigned to me</option>}
          <option value="unassigned">Unassigned</option>
          {members
            .filter((m) => m.id !== currentUserId)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
        </select>
      )}

      {active && (
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <span>
            {shown} of {total}
          </span>
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-gray-300 hover:bg-white/10"
            title="Clear filters"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}
    </div>
  );
}
