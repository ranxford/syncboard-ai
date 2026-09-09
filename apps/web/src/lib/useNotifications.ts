"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/store/auth";
import { toast } from "@/store/toast";

type AppNotification = {
  type: "project.added" | "project.invited" | "syncroom.started" | "alignment.assigned";
  message: string;
  projectId: string;
  projectName: string;
  boardUrl: string;
  positionLabel?: string;
};

/** Realtime toasts for project invites, analyzer updates, and SyncRoom starts. */
export function useNotifications() {
  const status = useAuth((s) => s.status);
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;

    const socket = getSocket();
    const onNotification = (n: AppNotification) => {
      toast.info(n.message);
      if (n.type === "project.added" || n.type === "alignment.assigned") {
        window.dispatchEvent(new CustomEvent("syncboard:dashboard-updated"));
      }
      if (n.type === "syncroom.started" && n.boardUrl) {
        try {
          router.prefetch(new URL(n.boardUrl).pathname);
        } catch {
          /* ignore malformed URLs */
        }
      }
    };

    const onDashboardUpdated = () => {
      window.dispatchEvent(new CustomEvent("syncboard:dashboard-updated"));
    };

    socket.on("notification", onNotification);
    socket.on("dashboard:updated", onDashboardUpdated);
    return () => {
      socket.off("notification", onNotification);
      socket.off("dashboard:updated", onDashboardUpdated);
    };
  }, [status, router]);
}
