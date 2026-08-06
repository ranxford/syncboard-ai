import type { Column, Member, MeetingResult, Priority } from "@/lib/types";

export function matchMemberByHint(hint: string | undefined, members: Member[]): string | null {
  if (!hint) return null;
  const h = hint.trim().toLowerCase();
  const found = members.find(
    (m) => m.name.toLowerCase() === h || m.name.toLowerCase().split(" ")[0] === h,
  );
  return found?.id ?? null;
}

/** Prefer intake/backlog-style columns, else first column. */
export function defaultActionColumn(columns: Column[]): string {
  const intake = columns.find((c) =>
    /backlog|ideas|pipeline|intake|requests|exploration|submitted|to do|todo/i.test(c.name),
  );
  if (intake) return intake.id;
  return columns[0]?.id ?? "";
}

export function actionItemsForImport(
  result: MeetingResult,
  members: Member[],
  existingTitles: string[] = [],
): { title: string; priority: Priority; assigneeId: string | null }[] {
  const existing = new Set(existingTitles.map((t) => t.trim().toLowerCase()));
  return result.actionItems
    .filter((a) => !existing.has(a.title.trim().toLowerCase()))
    .map((a) => ({
      title: a.title,
      priority: a.priority,
      assigneeId: matchMemberByHint(a.assigneeHint, members),
    }));
}

export function formatOutcomeComment(result: MeetingResult): string {
  return [
    "## SyncRoom outcomes",
    "",
    result.summary,
    "",
    result.decisions.length
      ? `**Decisions:**\n${result.decisions.map((d) => `- ${d}`).join("\n")}`
      : "",
    result.actionItems.length
      ? `**Action items created on the board:**\n${result.actionItems.map((a) => `- ${a.title}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
