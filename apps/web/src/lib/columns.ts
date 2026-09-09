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
