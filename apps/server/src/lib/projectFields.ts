/** Industry / domain options — SyncBoard is not software-only. */
export const PROJECT_FIELDS = [
  {
    id: "general",
    label: "General / Other",
    columns: ["Ideas", "To Do", "In Progress", "Review", "Done"],
    labels: ["priority", "blocked", "follow-up", "docs", "meeting"],
  },
  {
    id: "business",
    label: "Business & Operations",
    columns: ["Pipeline", "Active", "Waiting", "Done"],
    labels: ["sales", "ops", "partner", "compliance", "finance", "client", "marketing", "hr"],
  },
  {
    id: "mining",
    label: "Mining & Resources",
    columns: ["Exploration", "Planning", "Operations", "Safety review", "Complete"],
    labels: ["safety", "geology", "equipment", "permit", "site", "survey", "haulage"],
  },
  {
    id: "telecommunications",
    label: "Telecommunications",
    columns: ["Requests", "Design", "Rollout", "Monitor", "Done"],
    labels: ["network", "tower", "customer", "outage", "install", "fiber", "coverage"],
  },
  {
    id: "healthcare",
    label: "Healthcare",
    columns: ["Intake", "In progress", "Review", "Closed"],
    labels: ["patient", "clinic", "compliance", "supply", "referral", "staffing", "records"],
  },
  {
    id: "education",
    label: "Education",
    columns: ["Ideas", "Preparing", "Running", "Review", "Done"],
    labels: ["curriculum", "students", "assessment", "admin", "event", "parents", "timetable"],
  },
  {
    id: "construction",
    label: "Construction",
    columns: ["Planning", "Procurement", "On site", "Inspection", "Handover"],
    labels: ["site", "materials", "safety", "inspection", "client", "subcontractor", "drawings"],
  },
  {
    id: "agriculture",
    label: "Agriculture",
    columns: ["Planning", "In season", "Harvest", "Done"],
    labels: ["crop", "livestock", "irrigation", "market", "season", "soil", "harvest"],
  },
  {
    id: "logistics",
    label: "Logistics & Supply",
    columns: ["Requests", "In transit", "Customs", "Delivered"],
    labels: ["shipment", "warehouse", "customs", "fleet", "route", "inventory", "delivery"],
  },
  {
    id: "energy",
    label: "Energy & Utilities",
    columns: ["Planning", "Active", "Maintenance", "Done"],
    labels: ["grid", "maintenance", "safety", "outage", "meter", "plant", "inspection"],
  },
  {
    id: "finance",
    label: "Finance & Banking",
    columns: ["Pipeline", "In review", "Approved", "Closed"],
    labels: ["audit", "client", "risk", "compliance", "reporting", "credit", "treasury"],
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    columns: ["Orders", "Production", "QA", "Shipped"],
    labels: ["line", "qa", "inventory", "supplier", "shipping", "maintenance", "orders"],
  },
  {
    id: "government",
    label: "Government & Public",
    columns: ["Submitted", "In progress", "Review", "Resolved"],
    labels: ["citizen", "permit", "policy", "hearing", "records", "service", "budget"],
  },
  {
    id: "technology",
    label: "Technology / Software",
    columns: ["Backlog", "To Do", "In Progress", "Review", "Done"],
    labels: ["frontend", "backend", "design", "bug", "infra", "devops", "api"],
  },
] as const;

export type ProjectFieldId = (typeof PROJECT_FIELDS)[number]["id"];

export function isProjectField(value: string): value is ProjectFieldId {
  return PROJECT_FIELDS.some((f) => f.id === value);
}

export function fieldLabel(id: string): string {
  return PROJECT_FIELDS.find((f) => f.id === id)?.label ?? "General / Other";
}

export function suggestedLabelsForField(field: string): string[] {
  const preset = PROJECT_FIELDS.find((f) => f.id === field) ?? PROJECT_FIELDS[0];
  return [...preset.labels];
}

export function columnsForField(field: string): { name: string; order: number; wipLimit: number | null }[] {
  const preset = PROJECT_FIELDS.find((f) => f.id === field) ?? PROJECT_FIELDS[0];
  return preset.columns.map((name, order) => ({
    name,
    order,
    wipLimit:
      name.toLowerCase().includes("progress") ||
      name.toLowerCase() === "active" ||
      name.toLowerCase() === "production"
        ? 4
        : name.toLowerCase().includes("review") ||
            name.toLowerCase() === "qa" ||
            name.toLowerCase() === "inspection"
          ? 3
          : null,
  }));
}
