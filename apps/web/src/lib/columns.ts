/** Client-side column helpers — mirrors server column rules. */

export function canCreateTaskInColumn(columnName: string): boolean {
  return /backlog|todo|to do|ideas|pipeline|intake|submitted|planning|exploration|requests/i.test(
    columnName,
  );
}

export function isReviewColumn(columnName: string): boolean {
  return /review|qa|inspection|in review|safety review/i.test(columnName);
}

export function isDoneColumnName(columnName: string, order: number, maxOrder: number, total: number): boolean {
  if (/done|complete|shipped|closed|resolved|handover|delivered/i.test(columnName)) return true;
  return total > 1 && order === maxOrder;
}

/** Whether a task may be dropped into Done (Review gate + passed review, or explicit admin override). */
export function canMoveTaskToDone(task: {
  reviewStatus?: string;
  reviewOverride?: boolean;
  hasBeenInReview?: boolean;
}): boolean {
  if (task.reviewOverride) return true;
  return task.reviewStatus === "passed" && task.hasBeenInReview === true;
}

export function doneMoveBlockedMessage(task: {
  reviewStatus?: string;
  hasBeenInReview?: boolean;
}): string {
  if (!task.hasBeenInReview) {
    return "Tasks must go through Review before Done. Move the card to the Review column first.";
  }
  if (task.reviewStatus === "failed") {
    return "DeepSeek review failed — fix issues and re-submit in Review before moving to Done.";
  }
  if (task.reviewStatus === "pending") {
    return "DeepSeek review is still running — wait for approval before moving to Done.";
  }
  if (task.reviewStatus === "none") {
    return "Upload your completed work in Review and submit for automated review before Done.";
  }
  return "DeepSeek review must pass before moving to Done.";
}
