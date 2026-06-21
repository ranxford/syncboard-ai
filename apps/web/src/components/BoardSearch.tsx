"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { api } from "@/lib/api";
import type { SearchResult } from "@/lib/types";
import { PRIORITY_STYLES } from "@/lib/ui";

export function BoardSearch({
  projectId,
  onSelect,
}: {
  projectId: string;
  onSelect: (taskId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { results } = await api.searchTasks(projectId, q.trim());
        setResults(results);
        setOpen(true);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, projectId]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-ink-800 px-2.5 py-1.5">
        <Search className="h-4 w-4 text-gray-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search tasks…"
          className="w-32 bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none focus:w-44 transition-all"
        />
        {q && (
          <button onClick={() => setQ("")} className="text-gray-500 hover:text-gray-300">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && q.trim() && (
        <div className="glass absolute right-0 top-11 z-40 max-h-80 w-80 overflow-y-auto rounded-xl p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">No matching tasks.</p>
          ) : (
            results.map((r) => {
              const prio = PRIORITY_STYLES[r.priority];
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    onSelect(r.id);
                    setOpen(false);
                    setQ("");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/5"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: prio.dot }} />
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-200">{r.title}</span>
                  <span className="shrink-0 text-xs text-gray-500">{r.column.name}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
