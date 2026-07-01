import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../env.js";
import { prisma } from "../prisma.js";
import { verifyToken } from "../lib/jwt.js";
import { getMembership } from "../lib/access.js";
import { presence } from "./presence.js";
import { calls } from "./calls.js";
import { callRoomFor, roomFor, setIo } from "./io.js";

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
      // Let the newly-joined board viewer know if a meeting is already in progress.
      socket.emit("call:participants", { projectId, participants: calls.list(projectId) });
    });

    socket.on("board:leave", (projectId: string) => {
      socket.leave(roomFor(projectId));
      const affected = presence.leaveSocket(socket.id);
      for (const pid of affected) {
        io.to(roomFor(pid)).emit("presence:updated", { projectId: pid, users: presence.list(pid) });
      }
    });

    // ── Video meeting signaling (WebRTC) ──────────────────────────
    // The server never sees media; it only relays SDP/ICE and tracks the roster.
    function broadcastRoster(projectId: string) {
      io.to(roomFor(projectId)).emit("call:participants", {
        projectId,
        participants: calls.list(projectId),
      });
    }

    socket.on(
      "call:join",
      async (
        payload: {
          projectId: string;
          micOn?: boolean;
          camOn?: boolean;
          focusTaskId?: string | null;
          focusTaskTitle?: string | null;
        },
        ack?: (res: { peers: ReturnType<typeof calls.list> } | { error: string }) => void,
      ) => {
        const projectId = payload?.projectId;
        if (typeof projectId !== "string") return ack?.({ error: "bad-request" });
        const membership = await getMembership(user.id, projectId);
        if (!membership) return ack?.({ error: "forbidden" });

        const peers = calls.list(projectId).filter((p) => p.socketId !== socket.id);
        const self = {
          socketId: socket.id,
          userId: user.id,
          name: user.name,
          avatarColor: user.avatarColor,
          micOn: payload.micOn ?? true,
          camOn: payload.camOn ?? true,
          sharingScreen: false,
          focusTaskId: payload.focusTaskId ?? null,
          focusTaskTitle: payload.focusTaskTitle ?? null,
        };
        calls.join(projectId, self);
        socket.join(callRoomFor(projectId));

        // Existing peers learn about the newcomer (they will NOT offer — the
        // newcomer initiates to avoid offer glare).
        socket.to(callRoomFor(projectId)).emit("call:peer-joined", { peer: self });
        broadcastRoster(projectId);
        ack?.({ peers });
      },
    );

    socket.on("call:signal", (payload: { to: string; data: unknown }) => {
      const { to, data } = payload ?? {};
      if (typeof to !== "string" || !calls.sameCall(socket.id, to)) return;
      io.to(to).emit("call:signal", { from: socket.id, data });
    });

    socket.on(
      "call:media",
      (payload: { micOn: boolean; camOn: boolean; sharingScreen?: boolean }) => {
        const p = calls.setMedia(
          socket.id,
          !!payload?.micOn,
          !!payload?.camOn,
          !!payload?.sharingScreen,
        );
        const projectId = calls.projectOf(socket.id);
        if (p && projectId) {
          socket.to(callRoomFor(projectId)).emit("call:peer-media", {
            socketId: socket.id,
            micOn: p.micOn,
            camOn: p.camOn,
            sharingScreen: p.sharingScreen,
          });
        }
      },
    );

    function leaveCall() {
      const projectId = calls.leaveSocket(socket.id);
      if (!projectId) return;
      socket.leave(callRoomFor(projectId));
      io.to(callRoomFor(projectId)).emit("call:peer-left", { socketId: socket.id });
      broadcastRoster(projectId);
    }

    socket.on("call:leave", () => leaveCall());

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
      leaveCall();
      const affected = presence.leaveSocket(socket.id);
      for (const pid of affected) {
        io.to(roomFor(pid)).emit("presence:updated", { projectId: pid, users: presence.list(pid) });
      }
    });
  });

  return io;
}
