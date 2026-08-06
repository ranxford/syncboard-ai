/** Client helpers for field-specific alignment tracks (definitions come from the API). */

export type AlignmentTrack = {
  key: string;
  label: string;
  shortLabel: string;
  defaultCriteria: string;
  accent: string;
};

const ACCENT_CLASSES: Record<string, string> = {
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  sky: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  teal: "border-teal-500/30 bg-teal-500/10 text-teal-200",
  orange: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  gray: "border-white/20 bg-white/5 text-gray-300",
};

export function trackFromList(tracks: AlignmentTrack[], key: string): AlignmentTrack | null {
  if (!key || key === "custom") return null;
  return tracks.find((t) => t.key === key) ?? null;
}

export function positionLabelForKey(
  tracks: AlignmentTrack[],
  key: string,
  customLabel = "",
): string {
  const t = trackFromList(tracks, key);
  if (t) return t.label;
  if (key === "custom") return customLabel.trim();
  return customLabel.trim();
}

export function defaultCriteriaForKey(tracks: AlignmentTrack[], key: string): string {
  return trackFromList(tracks, key)?.defaultCriteria ?? "";
}

export function positionBadgeClass(key: string, tracks: AlignmentTrack[] = []): string {
  if (key === "custom") return ACCENT_CLASSES.gray;
  const t = trackFromList(tracks, key);
  if (t?.accent && ACCENT_CLASSES[t.accent]) return ACCENT_CLASSES[t.accent];
  return "border-white/10 bg-white/5 text-gray-500";
}

export function listPositionOptions(tracks: AlignmentTrack[]) {
  return [
    ...tracks,
    {
      key: "custom",
      label: "Custom role",
      shortLabel: "Custom",
      defaultCriteria: "",
      accent: "gray",
    },
  ];
}

/** Group collaborators using the field's track order. */
export function groupCollaboratorsByTrack(
  collaborators: { positionKey: string; userId: string }[],
  tracks: AlignmentTrack[],
) {
  const order = [...tracks.map((t) => t.key), "custom", ""];
  const groups = new Map<string, typeof collaborators>();
  for (const c of collaborators) {
    const key = c.positionKey || "";
    const list = groups.get(key) ?? [];
    list.push(c);
    groups.set(key, list);
  }
  return order
    .filter((k) => groups.has(k))
    .map((k) => {
      const track = trackFromList(tracks, k);
      return {
        key: k,
        label: track ? `${track.label} track` : k === "custom" ? "Custom roles" : "Unassigned",
        track,
        collaborators: groups.get(k)!,
      };
    });
}

export function trackSummaryLabels(tracks: AlignmentTrack[]): string {
  if (tracks.length === 0) return "role tracks";
  return tracks.map((t) => t.shortLabel).join(", ");
}
