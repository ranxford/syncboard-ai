"use client";

import { Filter, X } from "lucide-react";
import type { Member, Priority } from "@/lib/types";
import { PRIORITY_STYLES } from "@/lib/ui";

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

export interface BoardFilterState {
  labels: string[];
  assigneeId: string | null; // null = anyone, "unassigned" sentinel, otherwise a user id
  priorities: Priority[];
  columnIds: string[];
}

export const EMPTY_FILTERS: BoardFilterState = {
  labels: [],
  assigneeId: null,
  priorities: [],
  columnIds: [],
};

export function isFilterActive(f: BoardFilterState): boolean {
  return (
    f.labels.length > 0 ||
    f.assigneeId !== null ||
    f.priorities.length > 0 ||
    f.columnIds.length > 0
  );
}

// ── URL (de)serialization so filters survive reload and are shareable ──
export function filtersToSearch(f: BoardFilterState): string {
  const p = new URLSearchParams();
  if (f.labels.length) p.set("labels", f.labels.join(","));
  if (f.priorities.length) p.set("priority", f.priorities.join(","));
  if (f.assigneeId) p.set("assignee", f.assigneeId);
  if (f.columnIds.length) p.set("columns", f.columnIds.join(","));
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
  const columnIds = (p.get("columns") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return { labels, priorities, assigneeId: assignee || null, columnIds };
}

export function BoardFilters({
  allLabels,
  suggestedLabels = [],
  columns = [],
  members,
  currentUserId,
  fieldLabel,
  filters,
  onChange,
  shown,
  total,
}: {
  allLabels: string[];
  suggestedLabels?: string[];
  columns?: { id: string; name: string }[];
  members: Member[];
  currentUserId?: string;
  fieldLabel?: string;
  filters: BoardFilterState;
  onChange: (next: BoardFilterState) => void;
  shown: number;
  total: number;
}) {
  const active = isFilterActive(filters);
  const labelOptions = [
    ...suggestedLabels,
    ...allLabels.filter((l) => !suggestedLabels.includes(l)),
  ];

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

  function toggleColumn(columnId: string) {
    const has = filters.columnIds.includes(columnId);
    onChange({
      ...filters,
      columnIds: has
        ? filters.columnIds.filter((id) => id !== columnId)
        : [...filters.columnIds, columnId],
    });
  }

  if (labelOptions.length === 0 && members.length === 0 && columns.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/[0.07] bg-ink-900/40 px-4 py-2 md:px-6">
      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <Filter className="h-3.5 w-3.5" />
        Filter
        {fieldLabel && <span className="pill font-normal">{fieldLabel}</span>}
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

      {columns.length > 0 && <span className="h-4 w-px bg-white/10" aria-hidden />}

      {columns.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {columns.map((col) => {
            const on = filters.columnIds.includes(col.id);
            return (
              <button
                key={col.id}
                onClick={() => toggleColumn(col.id)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  on ? "bg-white/15 text-gray-100 ring-1 ring-white/25" : "bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
                aria-pressed={on}
                title={`Show only “${col.name}”`}
              >
                {col.name}
              </button>
            );
          })}
        </div>
      )}

      {labelOptions.length > 0 && <span className="h-4 w-px bg-white/10" aria-hidden />}

      <div className="flex flex-wrap items-center gap-1.5">
        {labelOptions.map((label) => {
          const on = filters.labels.includes(label);
          const suggested = !allLabels.includes(label);
          return (
            <button
              key={label}
              onClick={() => toggleLabel(label)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                on
                  ? "bg-white/20 text-white ring-1 ring-white/30"
                  : suggested
                    ? "border border-dashed border-white/15 bg-transparent text-gray-400 hover:bg-white/5"
                    : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
              aria-pressed={on}
              title={suggested ? "Suggested for this field" : undefined}
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
