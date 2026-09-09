"use client";

import { Sparkles } from "lucide-react";
import type { AiProviderInfo } from "@/lib/types";

export function DeepSeekBadge({
  info,
  compact = false,
}: {
  info?: AiProviderInfo | null;
  compact?: boolean;
}) {
  const active = info?.provider === "deepseek" && info.configured;
  const label = active ? "DeepSeek" : info?.provider === "deepseek" ? "DeepSeek (offline)" : "AI";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${
        active
          ? "border-violet-500/30 bg-violet-500/10 text-violet-200"
          : "border-white/10 bg-white/[0.03] text-gray-500"
      } ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`}
      title={
        active
          ? `Powered by DeepSeek (${info?.model ?? "deepseek-chat"})`
          : "Heuristic AI — set DEEPSEEK_API_KEY for full DeepSeek"
      }
    >
      <Sparkles className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {!compact && <span>{label}</span>}
      {compact && <span className="hidden sm:inline">{label}</span>}
    </span>
  );
}
