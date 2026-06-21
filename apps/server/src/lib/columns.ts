import { prisma } from "../prisma.js";

export function columnIsDone(name: string, order: number, maxOrder: number, total: number): boolean {
  if (/done|complete|shipped|closed|resolved/i.test(name)) return true;
  return total > 1 && order === maxOrder;
}

export async function isDoneColumn(projectId: string, columnId: string): Promise<boolean> {
  const columns = await prisma.column.findMany({ where: { projectId } });
  const target = columns.find((c) => c.id === columnId);
  if (!target) return false;
  const maxOrder = Math.max(...columns.map((c) => c.order));
  return columnIsDone(target.name, target.order, maxOrder, columns.length);
}
