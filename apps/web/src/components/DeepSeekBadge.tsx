"use client";

import { Sparkles } from "lucide-react";
import type { AiProviderInfo } from "@/lib/types";

/** Compact AI status indicator — minimal branding. */
export function DeepSeekBadge({
  info,
  compact = false,
}: {
  info?: AiProviderInfo | null;
  compact?: boolean;
}) {
  const active = info?.configured ?? false;
  const label = active ? "AI" : "AI (offline)";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${
        active
          ? "border-brand-500/30 bg-brand-500/10 text-brand-200"
          : "border-white/10 bg-white/[0.03] text-gray-500"
      } ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`}
      title={
        active
          ? `AI assistant active (${info?.model ?? "default"})`
          : "Heuristic AI — configure API key for full AI features"
      }
    >
      <Sparkles className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {!compact && <span>{label}</span>}
      {compact && <span className="hidden sm:inline">{label}</span>}
    </span>
  );
}
