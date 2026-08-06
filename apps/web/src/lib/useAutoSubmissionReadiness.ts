"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { SubmissionReadiness } from "@/lib/types";
import { useAuth } from "@/store/auth";
import { useBoard } from "@/store/board";

const DEBOUNCE_MS = 900;

/** Re-runs the submission analyzer whenever the member's board work changes. */
export function useAutoSubmissionReadiness(projectId: string, enabled: boolean) {
  const board = useBoard((s) => s.board);
  const userId = useAuth((s) => s.user?.id);
  const [readiness, setReadiness] = useState<SubmissionReadiness | null>(null);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const workFingerprint = useMemo(() => {
    if (!board || !userId) return "";
    const parts: string[] = [];
    for (const col of board.columns) {
      for (const t of col.tasks) {
        if (t.assigneeId !== userId) continue;
        parts.push(`${t.id}|${t.title}|${t.description}|${col.name}|${t.completedAt ?? ""}`);
      }
    }
    parts.push(board.project.requirements ?? "");
    return parts.join(";;");
  }, [board, userId]);

  const runCheck = useCallback(async () => {
    if (!enabled) return null;
    setAnalyzing(true);
    try {
      const data = await api.getSubmissionReadiness(projectId);
      setReadiness(data.readiness);
      setExistingStatus(data.existingSubmission?.status ?? null);
      setLastCheckedAt(new Date());
      return data;
    } finally {
      setAnalyzing(false);
    }
  }, [projectId, enabled]);

  useEffect(() => {
    if (!enabled || !workFingerprint) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void runCheck();
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, workFingerprint, runCheck]);

  useEffect(() => {
    if (!enabled) return;
    const onTimeline = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string }>).detail;
      if (detail?.projectId === projectId) void runCheck();
    };
    const onSources = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string }>).detail;
      if (detail?.projectId === projectId) void runCheck();
    };
    window.addEventListener("syncboard:timeline-updated", onTimeline);
    window.addEventListener("syncboard:review-sources-updated", onSources);
    return () => {
      window.removeEventListener("syncboard:timeline-updated", onTimeline);
      window.removeEventListener("syncboard:review-sources-updated", onSources);
    };
  }, [enabled, projectId, runCheck]);

  return {
    readiness,
    existingStatus,
    analyzing,
    lastCheckedAt,
    refresh: runCheck,
  };
}
