import { prisma } from "../prisma.js";

export function columnIsDone(name: string, order: number, maxOrder: number, total: number): boolean {
  if (/done|complete|shipped|closed|resolved|handover|delivered/i.test(name)) return true;
  return total > 1 && order === maxOrder;
}

export function columnIsReview(name: string): boolean {
  return /review|qa|inspection|in review|safety review/i.test(name);
}

export async function isDoneColumn(projectId: string, columnId: string): Promise<boolean> {
  const columns = await prisma.column.findMany({ where: { projectId } });
  const target = columns.find((c) => c.id === columnId);
  if (!target) return false;
  const maxOrder = Math.max(...columns.map((c) => c.order));
  return columnIsDone(target.name, target.order, maxOrder, columns.length);
}

export async function isReviewColumn(projectId: string, columnId: string): Promise<boolean> {
  const col = await prisma.column.findFirst({ where: { id: columnId, projectId } });
  return col ? columnIsReview(col.name) : false;
}

/** Backfill a Review gate column for boards created before the review workflow existed. */
export async function ensureReviewColumn(projectId: string): Promise<boolean> {
  const columns = await prisma.column.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  if (columns.length === 0) return false;
  if (columns.some((c) => columnIsReview(c.name))) return false;

  const maxOrder = Math.max(...columns.map((c) => c.order));
  const doneCol = columns.find((c) =>
    columnIsDone(c.name, c.order, maxOrder, columns.length),
  );
  const insertOrder = doneCol ? doneCol.order : maxOrder + 1;

  await prisma.$transaction([
    ...columns
      .filter((c) => c.order >= insertOrder)
      .map((c) =>
        prisma.column.update({ where: { id: c.id }, data: { order: c.order + 1 } }),
      ),
    prisma.column.create({
      data: { projectId, name: "Review", order: insertOrder, wipLimit: 3 },
    }),
  ]);
  return true;
}
