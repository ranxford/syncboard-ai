/** Label (de)serialization. Labels are stored as a JSON string for SQLite. */

export function parseLabels(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function serializeLabels(labels: string[] | undefined): string {
  return JSON.stringify(Array.isArray(labels) ? labels : []);
}
