"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { SubmissionReadiness } from "@/lib/types";

/** Runs deliverable analysis when sources change or the user clicks Analyze. */
export function useAutoSubmissionReadiness(projectId: string, enabled: boolean) {
  const [readiness, setReadiness] = useState<SubmissionReadiness | null>(null);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const runCheck = useCallback(async () => {
    if (!enabled) return null;
    setAnalyzing(true);
    setError(null);
    try {
      const data = await api.getSubmissionReadiness(projectId);
      setReadiness(data.readiness);
      setExistingStatus(data.existingSubmission?.status ?? null);
      setLastCheckedAt(new Date());
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Analysis failed.";
      setError(message);
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, [projectId, enabled]);

  const sourcesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const onSources = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string }>).detail;
      if (detail?.projectId !== projectId) return;
      if (sourcesTimer.current) clearTimeout(sourcesTimer.current);
      sourcesTimer.current = setTimeout(() => {
        void runCheck();
      }, 600);
    };
    window.addEventListener("syncboard:review-sources-updated", onSources);
    return () => {
      window.removeEventListener("syncboard:review-sources-updated", onSources);
      if (sourcesTimer.current) clearTimeout(sourcesTimer.current);
    };
  }, [enabled, projectId, runCheck]);

  return {
    readiness,
    existingStatus,
    analyzing,
    error,
    lastCheckedAt,
    refresh: runCheck,
  };
}
