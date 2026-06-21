import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAY = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

async function main() {
  console.log("Seeding SyncBoard AI+ demo data…");

  // Clean slate (safe for a demo DB)
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const ada = await prisma.user.create({
    data: { email: "ada@syncboard.dev", name: "Ada Lovelace", passwordHash, avatarColor: "#6366f1" },
  });
  const grace = await prisma.user.create({
    data: { email: "grace@syncboard.dev", name: "Grace Hopper", passwordHash, avatarColor: "#ec4899" },
  });
  const linus = await prisma.user.create({
    data: { email: "linus@syncboard.dev", name: "Linus T.", passwordHash, avatarColor: "#10b981" },
  });

  const project = await prisma.project.create({
    data: {
      name: "SyncBoard Launch",
      description: "Bring the AI collaboration platform to v1.",
      ownerId: ada.id,
      members: {
        create: [
          { userId: ada.id, role: "owner" },
          { userId: grace.id, role: "member" },
          { userId: linus.id, role: "member" },
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
    },
    include: { columns: true },
  });

  const col = (name: string) => project.columns.find((c) => c.name === name)!;

  const tasks = [
    { title: "Design onboarding flow", column: "Backlog", assignee: grace.id, priority: "medium", est: 6, labels: ["design", "ux"] },
    { title: "Research offline sync strategy", column: "Backlog", assignee: null, priority: "low", est: 3, labels: ["research"] },
    { title: "Set up CI/CD pipeline", column: "To Do", assignee: ada.id, priority: "high", est: 5, labels: ["devops"] },
    { title: "Build kanban drag-and-drop", column: "To Do", assignee: ada.id, priority: "high", est: 8, labels: ["frontend", "ui"] },
    // Stagnant task: entered In Progress 6 days ago
    { title: "Implement WebSocket presence", column: "In Progress", assignee: ada.id, priority: "high", est: 8, entered: daysAgo(6), labels: ["realtime", "backend"] },
    { title: "Wire up AI analytics panel", column: "In Progress", assignee: ada.id, priority: "urgent", est: 10, labels: ["ai", "frontend"] },
    // Overdue task
    { title: "Write API documentation", column: "In Progress", assignee: ada.id, priority: "medium", est: 4, due: daysAgo(2), labels: ["docs"] },
    // Deadline approaching
    { title: "Security review", column: "Review", assignee: grace.id, priority: "high", est: 5, due: daysFromNow(1), labels: ["security"] },
    { title: "Accessibility audit", column: "Review", assignee: linus.id, priority: "medium", est: 4, labels: ["a11y"] },
    // Completed tasks
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

  // Seed a short comment thread on one task to showcase discussions.
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

  await prisma.activity.create({
    data: {
      projectId: project.id,
      userId: ada.id,
      type: "project.created",
      message: "created the project",
    },
  });

  console.log("\nDone! Demo accounts (password: password123):");
  console.log("  • ada@syncboard.dev   (owner)");
  console.log("  • grace@syncboard.dev (member)");
  console.log("  • linus@syncboard.dev (member)");
  console.log(`\nProject: ${project.name} (${project.id})\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
