import type { ProjectFieldId } from "./projectFields.js";
import { fieldLabel, isProjectField } from "./projectFields.js";

/** One assignable track within a project field — scored on that member's tasks + personal timeline only. */
export type AlignmentTrack = {
  key: string;
  label: string;
  shortLabel: string;
  defaultCriteria: string;
  accent: "violet" | "sky" | "rose" | "emerald" | "amber" | "teal" | "orange" | "gray";
};

const track = (
  key: string,
  label: string,
  defaultCriteria: string,
  accent: AlignmentTrack["accent"],
): AlignmentTrack => ({
  key,
  label,
  shortLabel: label,
  defaultCriteria,
  accent,
});

/** Position tracks tailored to each institution / project field. */
export const ALIGNMENT_TRACKS_BY_FIELD: Record<ProjectFieldId, AlignmentTrack[]> = {
  general: [
    track(
      "lead",
      "Project lead",
      "Coordination, planning, stakeholder updates, and decisions. Personal timeline and tasks should reflect leadership and delivery oversight.",
      "violet",
    ),
    track(
      "operations",
      "Operations",
      "Day-to-day execution, scheduling, and follow-through. Tasks and timeline should reflect operational delivery only.",
      "sky",
    ),
    track(
      "support",
      "Support & admin",
      "Documentation, communications, logistics, and back-office work. Tasks and timeline should reflect support delivery only.",
      "rose",
    ),
  ],
  business: [
    track(
      "sales",
      "Sales & growth",
      "Pipeline, proposals, client outreach, and revenue targets. Tasks and timeline should reflect sales work only.",
      "emerald",
    ),
    track(
      "operations",
      "Operations",
      "Process, vendor, finance, and internal ops. Tasks and timeline should reflect business operations only.",
      "sky",
    ),
    track(
      "client_delivery",
      "Client delivery",
      "Deliverables, account management, and client-facing outcomes. Tasks and timeline should reflect client work only.",
      "amber",
    ),
  ],
  mining: [
    track(
      "geology",
      "Geology & exploration",
      "Surveys, sampling, mapping, and resource assessment. Tasks and timeline should reflect exploration work only.",
      "amber",
    ),
    track(
      "operations",
      "Site operations",
      "Pit, haulage, equipment, and production schedules. Tasks and timeline should reflect site ops only.",
      "sky",
    ),
    track(
      "safety",
      "Safety & compliance",
      "Safety reviews, permits, incidents, and regulatory compliance. Tasks and timeline should reflect safety work only.",
      "rose",
    ),
  ],
  telecommunications: [
    track(
      "network",
      "Network & design",
      "Coverage, fiber, tower design, and network architecture. Tasks and timeline should reflect network work only.",
      "violet",
    ),
    track(
      "rollout",
      "Rollout & install",
      "Field install, splice, activation, and rollout schedules. Tasks and timeline should reflect rollout work only.",
      "sky",
    ),
    track(
      "customer",
      "Customer & outage",
      "Customer tickets, outages, SLA response, and communications. Tasks and timeline should reflect customer work only.",
      "rose",
    ),
  ],
  healthcare: [
    track(
      "clinical",
      "Clinical care",
      "Patient care, referrals, clinic flow, and treatment follow-up. Tasks and timeline should reflect clinical work only.",
      "rose",
    ),
    track(
      "admin",
      "Clinic admin",
      "Scheduling, intake, supplies, and staffing coordination. Tasks and timeline should reflect admin work only.",
      "sky",
    ),
    track(
      "compliance",
      "Compliance & records",
      "Records, audits, policies, and regulatory requirements. Tasks and timeline should reflect compliance work only.",
      "amber",
    ),
  ],
  education: [
    track(
      "curriculum",
      "Curriculum & teaching",
      "Lesson plans, assessments, materials, and classroom delivery. Tasks and timeline should reflect curriculum work only.",
      "violet",
    ),
    track(
      "students",
      "Student support",
      "Student welfare, tutoring, events, and parent communication. Tasks and timeline should reflect student support only.",
      "emerald",
    ),
    track(
      "administration",
      "School administration",
      "Timetables, exams, facilities, and admin processes. Tasks and timeline should reflect admin work only.",
      "sky",
    ),
  ],
  construction: [
    track(
      "site",
      "Site & build",
      "On-site work, trades, progress, and daily site logs. Tasks and timeline should reflect site work only.",
      "amber",
    ),
    track(
      "procurement",
      "Procurement & drawings",
      "Materials, subcontractors, drawings, and orders. Tasks and timeline should reflect procurement work only.",
      "sky",
    ),
    track(
      "safety_qa",
      "Safety & inspection",
      "Inspections, safety walks, QA sign-off, and handover checks. Tasks and timeline should reflect safety/QA only.",
      "rose",
    ),
  ],
  agriculture: [
    track(
      "crop",
      "Crop & fields",
      "Planting, irrigation, soil, pest control, and harvest planning. Tasks and timeline should reflect crop work only.",
      "emerald",
    ),
    track(
      "livestock",
      "Livestock",
      "Animal care, pens, feeding, health checks, and breeding schedules. Tasks and timeline should reflect livestock work only.",
      "amber",
    ),
    track(
      "market",
      "Market & logistics",
      "Pricing, sales, storage, transport, and seasonal labour. Tasks and timeline should reflect market/logistics work only.",
      "sky",
    ),
  ],
  logistics: [
    track(
      "warehouse",
      "Warehouse",
      "Inventory, picking, bays, and stock control. Tasks and timeline should reflect warehouse work only.",
      "sky",
    ),
    track(
      "fleet",
      "Fleet & routes",
      "Drivers, routes, customs, and dispatch. Tasks and timeline should reflect fleet work only.",
      "violet",
    ),
    track(
      "delivery",
      "Delivery & exceptions",
      "Last-mile delivery, customer exceptions, and proof of delivery. Tasks and timeline should reflect delivery work only.",
      "amber",
    ),
  ],
  energy: [
    track(
      "plant",
      "Plant operations",
      "Generation, plant runs, and operational logs. Tasks and timeline should reflect plant ops only.",
      "amber",
    ),
    track(
      "grid",
      "Grid & meters",
      "Grid status, metering, outages, and customer impact. Tasks and timeline should reflect grid work only.",
      "sky",
    ),
    track(
      "maintenance",
      "Maintenance & safety",
      "Planned maintenance, inspections, and safety checks. Tasks and timeline should reflect maintenance work only.",
      "rose",
    ),
  ],
  finance: [
    track(
      "client",
      "Client & credit",
      "Client onboarding, KYC, credit reviews, and relationship management. Tasks and timeline should reflect client work only.",
      "emerald",
    ),
    track(
      "risk",
      "Risk & compliance",
      "Risk assessments, compliance findings, and controls. Tasks and timeline should reflect risk work only.",
      "rose",
    ),
    track(
      "reporting",
      "Reporting & treasury",
      "Financial reporting, forecasts, audit evidence, and treasury. Tasks and timeline should reflect reporting work only.",
      "sky",
    ),
  ],
  manufacturing: [
    track(
      "production",
      "Production line",
      "Line runs, changeovers, throughput, and orders. Tasks and timeline should reflect production work only.",
      "amber",
    ),
    track(
      "qa",
      "Quality assurance",
      "QA batches, defects, testing, and release holds. Tasks and timeline should reflect QA work only.",
      "rose",
    ),
    track(
      "supply",
      "Supply & shipping",
      "Suppliers, parts, shipping, and inventory. Tasks and timeline should reflect supply work only.",
      "sky",
    ),
  ],
  government: [
    track(
      "service",
      "Citizen service",
      "Permits, casework, citizen requests, and service delivery. Tasks and timeline should reflect service work only.",
      "emerald",
    ),
    track(
      "policy",
      "Policy & hearings",
      "Policy drafts, hearings, briefings, and public communication. Tasks and timeline should reflect policy work only.",
      "violet",
    ),
    track(
      "records",
      "Records & budget",
      "Records management, archiving, and budget reporting. Tasks and timeline should reflect records work only.",
      "sky",
    ),
  ],
  technology: [
    track(
      "backend",
      "Backend",
      "Server APIs, database models, auth middleware, and backend reliability. Tasks and timeline should reflect backend work only.",
      "violet",
    ),
    track(
      "frontend",
      "Frontend",
      "UI components, client state, routing, and responsive layout. Tasks and timeline should reflect frontend work only.",
      "sky",
    ),
    track(
      "ui_ux",
      "UI/UX",
      "User flows, accessibility, visual design, and usability polish. Tasks and timeline should reflect design work only.",
      "rose",
    ),
  ],
};

export function normalizeProjectField(field: string | null | undefined): ProjectFieldId {
  if (field && isProjectField(field)) return field;
  return "general";
}

export function tracksForField(field: string | null | undefined): AlignmentTrack[] {
  return ALIGNMENT_TRACKS_BY_FIELD[normalizeProjectField(field)];
}

export function trackForKey(field: string | null | undefined, key: string): AlignmentTrack | null {
  if (!key || key === "custom") return null;
  return tracksForField(field).find((t) => t.key === key) ?? null;
}

export function positionLabelForKey(
  field: string | null | undefined,
  key: string,
  customLabel = "",
): string {
  const track = trackForKey(field, key);
  if (track) return track.label;
  if (key === "custom") return customLabel.trim();
  return customLabel.trim();
}

export function defaultCriteriaForKey(field: string | null | undefined, key: string): string {
  return trackForKey(field, key)?.defaultCriteria ?? "";
}

export function resolveMemberBrief(input: {
  field: string;
  positionKey: string;
  positionLabel: string;
  assignedRequirements: string;
}) {
  const key = input.positionKey?.trim() ?? "";
  const track = trackForKey(input.field, key);
  const label = track?.label ?? input.positionLabel.trim();
  const criteria =
    input.assignedRequirements.trim() || track?.defaultCriteria || "";
  return { positionKey: key, positionLabel: label, assignedRequirements: criteria };
}

export function listPositionOptions(field: string | null | undefined) {
  return [
    ...tracksForField(field),
    {
      key: "custom",
      label: "Custom role",
      shortLabel: "Custom",
      defaultCriteria: "",
      accent: "gray" as const,
    },
  ];
}

export function fieldAlignmentMeta(field: string | null | undefined) {
  const id = normalizeProjectField(field);
  return {
    projectField: id,
    fieldLabel: fieldLabel(id),
    positionTracks: tracksForField(id),
  };
}

/** Legacy tech keys still valid when field is technology. */
export function isKnownPositionKey(field: string | null | undefined, key: string): boolean {
  return trackForKey(field, key) !== null;
}
