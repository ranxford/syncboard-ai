/** Industry vocabularies — SyncBoard adapts to every institution, not only software. */

export const SOFTWARE_ONLY_LABELS = new Set([
  "frontend",
  "backend",
  "devops",
  "infra",
  "bug",
  "api",
  "sprint",
  "deploy",
  "ci",
  "cd",
  "fullstack",
  "mobile",
  "repo",
  "pr",
  "hotfix",
  "refactor",
  "websocket",
  "database",
  "blogs",
  "blog",
  "ux",
  "ui",
]);

export const PROJECT_FIELDS = [
  {
    id: "general",
    label: "General / Other",
    labels: ["priority", "blocked", "follow-up", "docs", "meeting"],
    ideaHint: "Share a suggestion the team can promote to the board",
    meetingSample: `Team notes:
- Ada to send the weekly status update by Friday.
- We agreed to keep the shared tracker as the source of truth.
- Grace will follow up with the partner next week.
- Someone should book the next check-in.
- Linus to prepare materials for the review.`,
  },
  {
    id: "business",
    label: "Business & Operations",
    labels: ["sales", "ops", "partner", "compliance", "finance", "client", "marketing", "hr"],
    ideaHint: "Propose a sales, ops, or partnership idea",
    meetingSample: `Ops meeting:
- Ada will close the Q3 partner proposal by Friday.
- We decided to pause the new market expansion until budget review.
- Grace needs the client invoice pack — urgent.
- Someone should refresh the vendor shortlist.
- Linus to prepare the board deck for next week.`,
  },
  {
    id: "mining",
    label: "Mining & Resources",
    labels: ["safety", "geology", "equipment", "permit", "site", "survey", "haulage"],
    ideaHint: "Suggest a site, safety, or operations improvement",
    meetingSample: `Site briefing:
- Ada will finish the pit survey map by Friday.
- We decided to hold blasting until the safety review clears.
- Grace needs the equipment maintenance log — urgent.
- Someone should check the haul-road drainage.
- Linus to prepare the permit renewal pack.`,
  },
  {
    id: "telecommunications",
    label: "Telecommunications",
    labels: ["network", "tower", "customer", "outage", "install", "fiber", "coverage"],
    ideaHint: "Suggest a network, tower, or customer improvement",
    meetingSample: `Network standup:
- Ada will finish the tower survey report by Friday.
- We decided to prioritize the downtown outage tickets.
- Grace needs the fiber splice schedule — urgent.
- Someone should check coverage gaps on the east route.
- Linus to prepare the customer notice for the maintenance window.`,
  },
  {
    id: "healthcare",
    label: "Healthcare",
    labels: ["patient", "clinic", "compliance", "supply", "referral", "staffing", "records"],
    ideaHint: "Suggest a clinic, staffing, or patient-care improvement",
    meetingSample: `Clinic huddle:
- Ada will complete the referral follow-ups by Friday.
- We decided to restock the supply cupboard this week.
- Grace needs the compliance checklist — urgent.
- Someone should cover Saturday intake.
- Linus to prepare the patient records audit notes.`,
  },
  {
    id: "education",
    label: "Education",
    labels: ["curriculum", "students", "assessment", "admin", "event", "parents", "timetable"],
    ideaHint: "Suggest a curriculum, event, or student support idea",
    meetingSample: `Faculty meeting:
- Ada will finish the assessment rubric by Friday.
- We decided to move the open day to next month.
- Grace needs the student support list — urgent.
- Someone should update the timetable for exam week.
- Linus to prepare parent communication.`,
  },
  {
    id: "construction",
    label: "Construction",
    labels: ["site", "materials", "safety", "inspection", "client", "subcontractor", "drawings"],
    ideaHint: "Suggest a site, materials, or safety improvement",
    meetingSample: `Site meeting:
- Ada will finish the foundation pour schedule by Friday.
- We decided to hold cladding until inspection clears.
- Grace needs the materials delivery confirmation — urgent.
- Someone should walk the scaffolding with safety.
- Linus to prepare the client progress photos.`,
  },
  {
    id: "agriculture",
    label: "Agriculture",
    labels: ["crop", "livestock", "irrigation", "market", "season", "soil", "harvest"],
    ideaHint: "Suggest a crop, livestock, or market idea",
    meetingSample: `Farm planning:
- Ada will finish the irrigation checks by Friday.
- We decided to delay harvest until moisture readings improve.
- Grace needs the market price sheet — urgent.
- Someone should inspect the livestock pens.
- Linus to prepare the seasonal labour roster.`,
  },
  {
    id: "logistics",
    label: "Logistics & Supply",
    labels: ["shipment", "warehouse", "customs", "fleet", "route", "inventory", "delivery"],
    ideaHint: "Suggest a shipment, warehouse, or route improvement",
    meetingSample: `Dispatch meeting:
- Ada will clear the customs hold by Friday.
- We decided to reroute the north-bound fleet.
- Grace needs the warehouse bay assignments — urgent.
- Someone should chase the delayed shipment.
- Linus to prepare the delivery exception report.`,
  },
  {
    id: "energy",
    label: "Energy & Utilities",
    labels: ["grid", "maintenance", "safety", "outage", "meter", "plant", "inspection"],
    ideaHint: "Suggest a grid, plant, or outage-response idea",
    meetingSample: `Plant briefing:
- Ada will finish the meter inspections by Friday.
- We decided to schedule maintenance on bay 3 overnight.
- Grace needs the outage timeline — urgent.
- Someone should walk the safety checklist.
- Linus to prepare the grid status note for operations.`,
  },
  {
    id: "finance",
    label: "Finance & Banking",
    labels: ["audit", "client", "risk", "compliance", "reporting", "credit", "treasury"],
    ideaHint: "Suggest an audit, risk, or client-service improvement",
    meetingSample: `Risk committee:
- Ada will finish the credit review pack by Friday.
- We decided to escalate the compliance finding.
- Grace needs the client KYC updates — urgent.
- Someone should refresh the treasury forecast.
- Linus to prepare the audit evidence folder.`,
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    labels: ["line", "qa", "inventory", "supplier", "shipping", "maintenance", "orders"],
    ideaHint: "Suggest a line, QA, or supplier improvement",
    meetingSample: `Production huddle:
- Ada will finish the line changeover by Friday.
- We decided to hold shipping until QA clears batch 14.
- Grace needs the supplier delay note — urgent.
- Someone should check spare parts inventory.
- Linus to prepare the orders backlog report.`,
  },
  {
    id: "government",
    label: "Government & Public",
    labels: ["citizen", "permit", "policy", "hearing", "records", "service", "budget"],
    ideaHint: "Suggest a permit, service, or citizen-facing improvement",
    meetingSample: `Service meeting:
- Ada will finish the permit queue review by Friday.
- We decided to publish the policy briefing next week.
- Grace needs the hearing attendance list — urgent.
- Someone should archive the closed records.
- Linus to prepare the citizen service update.`,
  },
  {
    id: "technology",
    label: "Technology / Software",
    labels: ["frontend", "backend", "design", "bug", "infra", "devops", "api"],
    ideaHint: "Suggest a product, design, or engineering idea",
    meetingSample: `Standup notes:
- Ada will finish the WebSocket presence feature by Friday.
- We decided to go with SQLite for local dev and Postgres in production.
- Grace needs to review the security audit, it's urgent.
- Someone should investigate the offline sync edge cases.
- Linus to prepare the demo deck for next week.`,
  },
] as const;

export type ProjectFieldId = (typeof PROJECT_FIELDS)[number]["id"];

export function fieldPreset(field: string | undefined) {
  return PROJECT_FIELDS.find((f) => f.id === field) ?? PROJECT_FIELDS[0];
}

export function fieldLabel(id: string | undefined): string {
  return fieldPreset(id).label;
}

export function suggestedLabelsForField(field: string | undefined): string[] {
  return [...fieldPreset(field).labels];
}

export function ideaHintForField(field: string | undefined): string {
  return fieldPreset(field).ideaHint;
}

export function meetingSampleForField(field: string | undefined): string {
  return fieldPreset(field).meetingSample;
}

/** Labels that belong on this board’s filter strip. */
export function filterLabelsForField(field: string | undefined, taskLabels: string[]): string[] {
  const suggested = suggestedLabelsForField(field);
  const tech = field === "technology";
  const fromTasks = taskLabels.filter((l) => {
    const key = l.trim().toLowerCase();
    if (!tech && SOFTWARE_ONLY_LABELS.has(key)) return false;
    return true;
  });
  return Array.from(new Set([...suggested, ...fromTasks])).sort((a, b) => a.localeCompare(b));
}
