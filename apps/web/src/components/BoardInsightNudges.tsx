"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useBoard } from "@/store/board";
import { toast } from "@/store/toast";

/** Surfaces new critical AI insights without opening the panel. */
export function BoardInsightNudges({ projectId }: { projectId: string }) {
  const board = useBoard((s) => s.board);
  const seen = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!board) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void api.getAnalytics(projectId).then(({ analytics }) => {
        for (const ins of analytics.insights) {
          const isAlign = ins.type === "alignment" || ins.type === "requirements";
          if (seen.current.has(ins.id)) continue;
          if (ins.severity === "critical") {
            seen.current.add(ins.id);
            toast.info(`${ins.title} — ${ins.detail}`);
          } else if (isAlign && ins.severity === "warning") {
            seen.current.add(ins.id);
            toast.info(`${ins.title} — ${ins.detail}`);
          }
        }
      });
    }, 2500);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [board, projectId]);

  return null;
}
