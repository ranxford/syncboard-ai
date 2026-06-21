import type { Priority } from "./types";

export const PRIORITY_STYLES: Record<Priority, { label: string; className: string; dot: string }> = {
  low: { label: "Low", className: "bg-slate-500/15 text-slate-300", dot: "#94a3b8" },
  medium: { label: "Medium", className: "bg-blue-500/15 text-blue-300", dot: "#60a5fa" },
  high: { label: "High", className: "bg-amber-500/15 text-amber-300", dot: "#fbbf24" },
  urgent: { label: "Urgent", className: "bg-red-500/15 text-red-300", dot: "#f87171" },
};

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function dueLabel(iso: string | null): { text: string; tone: "over" | "soon" | "ok" } | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: `Overdue ${Math.abs(days)}d`, tone: "over" };
  if (days <= 2) return { text: `Due in ${days}d`, tone: "soon" };
  return { text: `Due ${new Date(iso).toLocaleDateString()}`, tone: "ok" };
}
