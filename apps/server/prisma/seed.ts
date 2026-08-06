import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAY = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

async function main() {
  console.log("Seeding SyncBoard AI+ demo data…");

  await prisma.ideaVote.deleteMany();
  await prisma.reviewSource.deleteMany();
  await prisma.deliverableSubmission.deleteMany();
  await prisma.idea.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.projectInvite.deleteMany();
  await prisma.syncRoomArtifact.deleteMany();
  await prisma.syncRoomEvent.deleteMany();
  await prisma.syncRoomSession.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  const verified = new Date();

  const ada = await prisma.user.create({
    data: {
      email: "ada@syncboard.dev",
      name: "Ada Lovelace",
      passwordHash,
      avatarColor: "#2a9d8f",
      emailVerifiedAt: verified,
    },
  });
  const grace = await prisma.user.create({
    data: {
      email: "grace@syncboard.dev",
      name: "Grace Hopper",
      passwordHash,
      avatarColor: "#b91c1c",
      emailVerifiedAt: verified,
    },
  });
  const linus = await prisma.user.create({
    data: {
      email: "linus@syncboard.dev",
      name: "Linus T.",
      passwordHash,
      avatarColor: "#0e7490",
      emailVerifiedAt: verified,
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "SyncBoard Launch",
      description: "Bring the AI collaboration platform to v1.",
      requirements:
        "Ship the collaboration board, SyncRoom video sessions, and AI insights for launch. " +
        "Grace owns realtime and WebRTC; Linus focuses on onboarding UX, auth polish, and demo docs.",
      visibility: "shared",
      field: "technology",
      ownerId: ada.id,
      members: {
        create: [
          { userId: ada.id, role: "owner" },
          { userId: grace.id, role: "admin" },
          { userId: linus.id, role: "member", positionKey: "ui_ux", positionLabel: "UI/UX", assignedRequirements: "Onboarding UX flows, auth polish, accessibility audit, and demo documentation for launch." },
        ],
      },
      columns: {
        create: [
          { name: "Backlog", order: 0 },
          { name: "To Do", order: 1 },
          { name: "In Progress", order: 2, wipLimit: 4 },
          { name: "Review", order: 3, wipLimit: 3 },
          { name: "Done", order: 4 },
        ],
      },
      milestones: {
        create: [
          {
            title: "Planning",
            description: "Scope, research, scaffolding",
            status: "done",
            order: 0,
            completedAt: daysAgo(10),
            targetDate: daysAgo(8),
            ownerId: null,
          },
          {
            title: "Build",
            description: "Core board + SyncRoom",
            status: "active",
            order: 1,
            targetDate: daysFromNow(14),
            ownerId: null,
          },
          {
            title: "Launch",
            description: "Polish, docs, demo readiness",
            status: "upcoming",
            order: 2,
            targetDate: daysFromNow(30),
            ownerId: null,
          },
        ],
      },
    },
    include: { columns: true },
  });

  // Personal timelines for each collaborator
  for (const [userId, focus] of [
    [ada.id, { plan: "done", motion: "active", done: "upcoming" }],
    [grace.id, { plan: "done", motion: "active", done: "upcoming" }],
    [linus.id, { plan: "active", motion: "upcoming", done: "upcoming" }],
  ] as const) {
    await prisma.milestone.createMany({
      data: [
        {
          projectId: project.id,
          ownerId: userId,
          title: "My plan",
          description: "What I’m focusing on",
          status: focus.plan,
          order: 0,
          completedAt: focus.plan === "done" ? daysAgo(5) : null,
        },
        {
          projectId: project.id,
          ownerId: userId,
          title: "In motion",
          description: "Active personal work",
          status: focus.motion,
          order: 1,
        },
        {
          projectId: project.id,
          ownerId: userId,
          title: "Done",
          description: "Personal wrap-ups",
          status: focus.done,
          order: 2,
        },
      ],
    });
  }

  // Personal workspace for Ada
  await prisma.project.create({
    data: {
      name: "Ada’s notes",
      description: "Private scratchpad — only you can see this.",
      visibility: "personal",
      ownerId: ada.id,
      members: { create: { userId: ada.id, role: "owner" } },
      columns: {
        create: [
          { name: "Backlog", order: 0 },
          { name: "To Do", order: 1 },
          { name: "In Progress", order: 2, wipLimit: 4 },
          { name: "Review", order: 3, wipLimit: 3 },
          { name: "Done", order: 4 },
        ],
      },
      milestones: {
        create: [
          { title: "Planning", status: "active", order: 0, description: "" },
          { title: "Build", status: "upcoming", order: 1, description: "" },
          { title: "Launch", status: "upcoming", order: 2, description: "" },
        ],
      },
    },
  });

  const col = (name: string) => project.columns.find((c) => c.name === name)!;

  const tasks = [
    { title: "Design onboarding flow", column: "Backlog", assignee: grace.id, priority: "medium", est: 6, labels: ["design", "ux"] },
    { title: "Research offline sync strategy", column: "Backlog", assignee: null, priority: "low", est: 3, labels: ["research"] },
    { title: "Set up CI/CD pipeline", column: "To Do", assignee: ada.id, priority: "high", est: 5, labels: ["devops"] },
    { title: "Build kanban drag-and-drop", column: "To Do", assignee: ada.id, priority: "high", est: 8, labels: ["frontend", "ui"] },
    { title: "Implement WebSocket presence", column: "In Progress", assignee: ada.id, priority: "high", est: 8, entered: daysAgo(6), labels: ["realtime", "backend"] },
    { title: "Wire up AI analytics panel", column: "In Progress", assignee: ada.id, priority: "urgent", est: 10, labels: ["ai", "frontend"] },
    { title: "Write API documentation", column: "In Progress", assignee: ada.id, priority: "medium", est: 4, due: daysAgo(2), labels: ["docs"] },
    { title: "Security review", column: "Review", assignee: grace.id, priority: "high", est: 5, due: daysFromNow(1), labels: ["security"] },
    { title: "Accessibility audit", column: "Review", assignee: linus.id, priority: "medium", est: 4, labels: ["a11y"] },
    { title: "Project scaffolding", column: "Done", assignee: linus.id, priority: "medium", est: 3, completed: daysAgo(3), created: daysAgo(5), labels: [] },
    { title: "Auth + JWT", column: "Done", assignee: grace.id, priority: "high", est: 6, completed: daysAgo(1), created: daysAgo(4), labels: ["backend"] },
  ];

  let orderByCol: Record<string, number> = {};
  for (const t of tasks) {
    const columnId = col(t.column).id;
    orderByCol[columnId] = orderByCol[columnId] ?? 0;
    await prisma.task.create({
      data: {
        projectId: project.id,
        columnId,
        title: t.title,
        priority: t.priority,
        assigneeId: t.assignee,
        estimateHours: t.est,
        order: orderByCol[columnId]++,
        dueDate: (t as any).due ?? null,
        enteredColumnAt: (t as any).entered ?? new Date(),
        completedAt: (t as any).completed ?? null,
        createdAt: (t as any).created ?? new Date(),
        labels: JSON.stringify((t as any).labels ?? []),
      },
    });
  }

  const wsTask = await prisma.task.findFirst({
    where: { projectId: project.id, title: "Implement WebSocket presence" },
  });
  if (wsTask) {
    await prisma.comment.create({
      data: { taskId: wsTask.id, userId: grace.id, body: "Should we use one Socket.io room per project?" },
    });
    await prisma.comment.create({
      data: { taskId: wsTask.id, userId: ada.id, body: "Yes — joining `project:<id>` on board open. Pushing an update today." },
    });
  }

  const idea1 = await prisma.idea.create({
    data: {
      projectId: project.id,
      authorId: grace.id,
      title: "Async standup digest from AI Insights",
      body: "Daily toast + email digest of stalled/overdue items for each member.",
    },
  });
  await prisma.ideaVote.create({ data: { ideaId: idea1.id, userId: ada.id } });
  await prisma.ideaVote.create({ data: { ideaId: idea1.id, userId: linus.id } });

  await prisma.idea.create({
    data: {
      projectId: project.id,
      authorId: linus.id,
      title: "Guest observer mode for SyncRoom",
      body: "Allow invited reviewers to watch A/V without editing the board.",
    },
  });

  await prisma.activity.create({
    data: {
      projectId: project.id,
      userId: ada.id,
      type: "project.created",
      message: "created the project",
    },
  });

  console.log("\nDone! Demo accounts (password: password123) — emails pre-confirmed:");
  console.log("  • ada@syncboard.dev   (owner)");
  console.log("  • grace@syncboard.dev (admin)");
  console.log("  • linus@syncboard.dev (member)");
  console.log(`\nShared project: ${project.name}`);
  console.log("Personal project: Ada’s notes\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
