import http from "http";
import { env } from "./env.js";
import { createApp } from "./app.js";
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
