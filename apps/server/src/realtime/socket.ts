import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../env.js";
import { prisma } from "../prisma.js";
import { verifyToken } from "../lib/jwt.js";
import { getMembership } from "../lib/access.js";
import { presence } from "./presence.js";
import { roomFor, setIo } from "./io.js";

interface SocketUser {
  id: string;
  name: string;
  avatarColor: string;
}

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.webOrigin, credentials: true },
  });
  setIo(io);

  // Authenticate every socket via JWT in the handshake.
  io.use(async (socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization?.replace("Bearer ", ""));
    const payload = token ? verifyToken(token) : null;
    if (!payload) return next(new Error("unauthorized"));

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, avatarColor: true },
    });
    if (!user) return next(new Error("unauthorized"));
    (socket.data as { user: SocketUser }).user = user;
    next();
  });

  io.on("connection", (socket) => {
    const user = (socket.data as { user: SocketUser }).user;

    socket.on("board:join", async (projectId: string) => {
      if (typeof projectId !== "string") return;
      const membership = await getMembership(user.id, projectId);
      if (!membership) {
        socket.emit("error:message", "Not a member of this project");
        return;
      }
      socket.join(roomFor(projectId));
      presence.join(projectId, {
        userId: user.id,
        name: user.name,
        avatarColor: user.avatarColor,
        socketId: socket.id,
        focusedTaskId: null,
        lastSeen: Date.now(),
      });
      io.to(roomFor(projectId)).emit("presence:updated", {
        projectId,
        users: presence.list(projectId),
      });
    });

    socket.on("board:leave", (projectId: string) => {
      socket.leave(roomFor(projectId));
      const affected = presence.leaveSocket(socket.id);
      for (const pid of affected) {
        io.to(roomFor(pid)).emit("presence:updated", { projectId: pid, users: presence.list(pid) });
      }
    });

    // Live awareness: which task the user is currently editing/viewing.
    socket.on("task:focus", (taskId: string | null) => {
      const affected = presence.setFocus(socket.id, taskId ?? null);
      for (const pid of affected) {
        io.to(roomFor(pid)).emit("presence:updated", { projectId: pid, users: presence.list(pid) });
      }
    });

    // Lightweight latency probe used by the client's connectivity meter.
    socket.on("net:ping", (sentAt: number, ack?: (serverTime: number) => void) => {
      if (typeof ack === "function") ack(Date.now());
    });

    socket.on("disconnect", () => {
      const affected = presence.leaveSocket(socket.id);
      for (const pid of affected) {
        io.to(roomFor(pid)).emit("presence:updated", { projectId: pid, users: presence.list(pid) });
      }
    });
  });

  return io;
}
