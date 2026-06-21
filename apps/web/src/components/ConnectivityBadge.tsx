"use client";

import { Cloud, CloudOff, Loader2, Wifi } from "lucide-react";
import { useBoard } from "@/store/board";

export function ConnectivityBadge() {
  const connection = useBoard((s) => s.connection);
  const syncing = useBoard((s) => s.syncing);
  const pending = useBoard((s) => s.pendingCount);
  const latency = useBoard((s) => s.latency);
  const flush = useBoard((s) => s.flush);

  if (syncing) {
    return (
      <Badge className="bg-amber-500/15 text-amber-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing {pending > 0 ? `${pending}…` : "…"}
      </Badge>
    );
  }

  if (connection === "offline") {
    return (
      <button onClick={() => flush()} title="Try to sync now">
        <Badge className="bg-red-500/15 text-red-300 hover:bg-red-500/25">
          <CloudOff className="h-3.5 w-3.5" />
          Offline{pending > 0 ? ` · ${pending} queued` : ""}
        </Badge>
      </button>
    );
  }

  const quality =
    latency == null ? "online" : latency < 150 ? "strong" : latency < 500 ? "fair" : "weak";
  const tone =
    quality === "weak"
      ? "bg-amber-500/15 text-amber-300"
      : "bg-emerald-500/15 text-emerald-300";

  return (
    <Badge className={tone}>
      {latency == null ? <Cloud className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
      {latency == null ? "Online" : `${latency}ms`}
    </Badge>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}
