"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { api } from "@/lib/api";
import type { Activity } from "@/lib/types";
import { relativeTime } from "@/lib/ui";
import { Avatar } from "./Avatar";

export function ActivityFeed({ projectId, refreshKey }: { projectId: string; refreshKey: number }) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    let active = true;
    api
      .getActivity(projectId)
      .then(({ activities }) => {
        if (active) setActivities(activities);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [projectId, refreshKey]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <History className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-200">Activity</h3>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {activities.length === 0 && <p className="text-xs text-gray-500">No activity yet.</p>}
        {activities.map((a) => (
          <div key={a.id} className="flex items-start gap-2.5">
            {a.user ? (
              <Avatar name={a.user.name} color={a.user.avatarColor} size={26} />
            ) : (
              <span className="h-[26px] w-[26px] rounded-full bg-white/10" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-gray-300">
                <span className="font-medium text-gray-100">{a.user?.name ?? "Someone"}</span>{" "}
                {a.message}
              </p>
              <p className="text-[10px] text-gray-500">{relativeTime(a.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
