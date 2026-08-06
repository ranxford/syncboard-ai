import { nanoid } from "nanoid";
import type { AlignmentReport } from "./alignment.js";
import type { Insight } from "./types.js";

/** Turn alignment scores into the same insight stream as board analytics. */
export function insightsFromAlignment(report: AlignmentReport): Insight[] {
  const out: Insight[] = [];

  if (!report.hasBrief) {
    out.push({
      id: `align-brief-${nanoid(6)}`,
      type: "requirements",
      severity: "warning",
      title: "No manager requirements brief",
      detail:
        "Collaborators can’t be checked against scope until an owner or admin publishes requirements.",
      recommendation:
        "Open Alignment, write what each member should deliver, and save — then refresh analysis.",
    });
    return out;
  }

  for (const c of report.collaborators) {
    if (c.status === "off_track") {
      out.push({
        id: `align-off-${c.userId}`,
        type: "alignment",
        severity: "critical",
        title: `${c.name} is off track vs the brief`,
        detail: `${c.summary} (score ${c.score}%)`,
        recommendation:
          "Review their open tasks and personal timeline; realign titles and descriptions with the manager requirements.",
        userId: c.userId,
        taskIds: c.offTrackTasks.map((t) => t.id),
      });
    } else if (c.status === "drifting") {
      out.push({
        id: `align-drift-${c.userId}`,
        type: "alignment",
        severity: "warning",
        title: `${c.name} is drifting from the brief`,
        detail: `${c.summary} (score ${c.score}%)`,
        recommendation:
          c.missingThemes.length > 0
            ? `Cover missing themes: ${c.missingThemes.slice(0, 4).join(", ")}.`
            : "Tighten task wording so work reflects the manager brief.",
        userId: c.userId,
        taskIds: c.offTrackTasks.map((t) => t.id),
      });
    }
  }

  return out;
}
