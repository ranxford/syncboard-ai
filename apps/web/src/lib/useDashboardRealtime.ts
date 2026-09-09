"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import type { ProjectSummary } from "@/lib/types";
import { useAuth } from "@/store/auth";

function normalizeProject(p: ProjectSummary & { createdAt?: string | Date }): ProjectSummary {
  const createdAt =
    typeof p.createdAt === "string"
      ? p.createdAt
      : p.createdAt
        ? String(p.createdAt)
        : new Date().toISOString();
  return { ...p, createdAt };
}

/** Realtime dashboard updates when invited to a project or membership changes. */
export function useDashboardRealtime(
  onRefresh: () => void | Promise<void>,
  onProjectAdded: (project: ProjectSummary) => void,
) {
  const status = useAuth((s) => s.status);

  useEffect(() => {
    if (status !== "authenticated") return;

    const socket = getSocket();

    const refresh = () => void onRefresh();

    const onProjectAddedEvent = (payload: { project: ProjectSummary }) => {
      if (!payload?.project?.id) return;
      onProjectAdded(normalizeProject(payload.project));
      void onRefresh();
    };

    const onNotification = (n: { type?: string }) => {
      if (n?.type === "project.added") refresh();
    };

    socket.on("dashboard:updated", refresh);
    socket.on("dashboard:project-added", onProjectAddedEvent);
    socket.on("notification", onNotification);

    return () => {
      socket.off("dashboard:updated", refresh);
      socket.off("dashboard:project-added", onProjectAddedEvent);
      socket.off("notification", onNotification);
    };
  }, [status, onRefresh, onProjectAdded]);
}
