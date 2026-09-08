"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/store/auth";
import { toast } from "@/store/toast";

type AppNotification = {
  type: "project.added" | "project.invited" | "syncroom.started";
  message: string;
  projectId: string;
  projectName: string;
  boardUrl: string;
};

/** Realtime toasts for project invites and SyncRoom starts (all members, not just admins). */
export function useNotifications() {
  const status = useAuth((s) => s.status);
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;

    const socket = getSocket();
    const onNotification = (n: AppNotification) => {
      toast.info(n.message);
      if (n.type === "syncroom.started" && n.boardUrl) {
        try {
          router.prefetch(new URL(n.boardUrl).pathname);
        } catch {
          /* ignore malformed URLs */
        }
      }
    };

    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [status, router]);
}
