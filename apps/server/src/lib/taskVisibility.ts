import { isAdminRole } from "./teammates.js";

/** Members only see tasks assigned to them; admins see the full board. */
export function taskVisibleToViewer(
  assigneeId: string | null | undefined,
  viewerId: string,
  viewerRole: string | undefined,
): boolean {
  if (isAdminRole(viewerRole)) return true;
  return assigneeId === viewerId;
}

/** New tasks may only be created in backlog / intake columns. */
export function canCreateTaskInColumn(columnName: string): boolean {
  return /backlog|todo|to do|ideas|pipeline|intake|submitted|planning|exploration|requests/i.test(
    columnName,
  );
}
