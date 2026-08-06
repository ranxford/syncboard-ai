import type { Column } from "@/lib/types";

export function findColumnByName(columns: Column[], pattern: RegExp): Column | undefined {
  return columns.find((c) => pattern.test(c.name));
}
