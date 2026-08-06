"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { TeammateStatus } from "@/lib/types";
import { toast } from "@/store/toast";

const EMPTY: TeammateStatus[] = [];

function mergeTeammate(list: TeammateStatus[], update: TeammateStatus | null, offline: boolean) {
  if (offline || !update || (!update.projectId && !update.inSyncRoom)) {
    return list.filter((t) => t.userId !== update?.userId);
  }
  const hit = list.findIndex((t) => t.userId === update.userId);
  if (hit >= 0) {
    const next = [...list];
    next[hit] = update;
    return next;
  }
  return [...list, update];
}

function fingerprint(list: TeammateStatus[]) {
  return list
    .map(
      (t) =>
        `${t.userId}:${t.projectId ?? ""}:${t.focusedTaskId ?? ""}:${t.inSyncRoom ? 1 : 0}:${t.syncRoomTaskTitle ?? ""}`,
    )
    .join("|");
}

/** Live oversight for project admins — members do not receive peer focus details. */
export function useTeammateAwareness(
  initial?: TeammateStatus[],
  opts?: { notifySyncRoom?: boolean },
) {
  const seed = initial ?? EMPTY;
  const [teammates, setTeammates] = useState<TeammateStatus[]>(seed);
  const notify = opts?.notifySyncRoom ?? false;
  const lastFp = useRef(fingerprint(seed));

  const subscribe = useCallback(() => {
    const socket = getSocket();
    const onSnapshot = (p: { teammates: TeammateStatus[] }) => setTeammates(p.teammates ?? []);
    const onUpdate = (p: { teammate: TeammateStatus | null; offline?: boolean }) => {
      setTeammates((prev) => {
        const next = mergeTeammate(prev, p.teammate, !!p.offline);
        if (
          notify &&
          p.teammate?.inSyncRoom &&
          !prev.some((t) => t.userId === p.teammate?.userId && t.inSyncRoom)
        ) {
          const t = p.teammate;
          const where = t.projectName ? ` on “${t.projectName}”` : "";
          const task = t.syncRoomTaskTitle ? ` — “${t.syncRoomTaskTitle}”` : "";
          toast.info(`${t.name} started a SyncRoom${where}${task}`);
        }
        return next;
      });
    };

    const emitSubscribe = () => socket.emit("awareness:subscribe");
    if (socket.connected) emitSubscribe();
    socket.on("connect", emitSubscribe);
    socket.on("teammates:snapshot", onSnapshot);
    socket.on("teammate:updated", onUpdate);

    return () => {
      socket.off("connect", emitSubscribe);
      socket.off("teammates:snapshot", onSnapshot);
      socket.off("teammate:updated", onUpdate);
    };
  }, [notify]);

  useEffect(() => {
    if (!initial) return;
    const fp = fingerprint(initial);
    if (fp === lastFp.current) return;
    lastFp.current = fp;
    setTeammates(initial);
  }, [initial]);

  useEffect(() => subscribe(), [subscribe]);

  return teammates;
}
