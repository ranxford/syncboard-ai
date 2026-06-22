import http from "http";
import { env } from "./env.js";
import { createApp } from "./app.js";
import { prisma } from "./prisma.js";
import { initSocket } from "./realtime/socket.js";

const app = createApp();
const server = http.createServer(app);
initSocket(server);

server.listen(env.port, () => {
  console.log(`\n  SyncBoard AI+ server`);
  console.log(`  → http://localhost:${env.port}`);
  console.log(`  → AI provider: ${env.ai.provider}`);
  console.log(`  → Web origin:  ${env.webOrigin}\n`);
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[${signal}] shutting down…`);
  server.close(() => console.log("  http server closed"));
  try {
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
  // Force-exit if connections linger past the grace period.
  setTimeout(() => process.exit(0), 5000).unref();
}

for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, () => void shutdown(sig));
}
