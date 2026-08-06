"use client";

import Link from "next/link";
import { Eye, Radio } from "lucide-react";
import type { TeammateStatus } from "@/lib/types";
import { Avatar } from "./Avatar";

function statusLine(t: TeammateStatus): string {
  if (t.inSyncRoom) {
    return t.syncRoomTaskTitle
      ? `In SyncRoom on “${t.syncRoomTaskTitle}”`
      : "In a SyncRoom";
  }
  if (t.focusTaskTitle) return `On “${t.focusTaskTitle}”`;
  if (t.projectName) return `Viewing ${t.projectName}`;
  return "Online";
}

/** Admin oversight feed — only populated for owners/admins. */
export function TeammateLiveFeed({ teammates }: { teammates: TeammateStatus[] }) {
  if (teammates.length === 0) return null;

  return (
    <section className="glass mb-7 rounded-2xl p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-200">
        <Eye className="h-4 w-4 text-brand-400" /> Collaborator oversight
      </h2>
      <p className="mb-3 text-xs text-gray-500">
        As admin you can see what collaborators are doing across your communities. Regular members
        only see work that has been shared to the community timeline.
      </p>
      <div className="space-y-2">
        {teammates.map((t) => (
          <Link
            key={t.userId}
            href={
              t.projectId
                ? t.focusedTaskId
                  ? `/board/${t.projectId}?task=${t.focusedTaskId}`
                  : `/board/${t.projectId}`
                : "#"
            }
            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
          >
            <Avatar name={t.name} color={t.avatarColor} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-100">{t.name}</p>
              <p className="truncate text-xs text-gray-500">{statusLine(t)}</p>
            </div>
            {t.inSyncRoom && <Radio className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
          </Link>
        ))}
      </div>
    </section>
  );
}
