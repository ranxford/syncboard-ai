import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../env.js";
import { prisma } from "../prisma.js";
import { verifyToken } from "../lib/jwt.js";
import { getMembership } from "../lib/access.js";
import { presence } from "./presence.js";
import { calls } from "./calls.js";
import { awareness } from "./awareness.js";
import { activeTeammatesFor, notifyTeammates } from "./teammateNotify.js";
import { callRoomFor, roomFor, setIo, userRoomFor } from "./io.js";

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
    awareness.connect(socket.id, user);
    socket.join(userRoomFor(user.id));

    socket.on("awareness:subscribe", async () => {
      const teammates = await activeTeammatesFor(user.id);
      socket.emit("teammates:snapshot", { teammates });
    });

    socket.on("board:join", async (projectId: string) => {
      if (typeof projectId !== "string") return;
      const membership = await getMembership(user.id, projectId);
      if (!membership) {
        socket.emit("error:message", "Not a member of this project");
        return;
      }
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true },
      });
      socket.join(roomFor(projectId));
      presence.join(projectId, {
        userId: user.id,
        name: user.name,
        avatarColor: user.avatarColor,
        socketId: socket.id,
        focusedTaskId: null,
        lastSeen: Date.now(),
      });
      if (project) {
        awareness.setBoard(user.id, project);
        void notifyTeammates(user.id);
      }
      io.to(roomFor(projectId)).emit("presence:updated", {
        projectId,
        users: presence.list(projectId),
      });
      // Let the newly-joined board viewer know if a meeting is already in progress.
      socket.emit("call:participants", { projectId, participants: calls.list(projectId) });
    });

    socket.on("board:leave", (projectId: string) => {
      if (typeof projectId !== "string") return;
      socket.leave(roomFor(projectId));
      presence.leaveProject(socket.id, projectId);
      io.to(roomFor(projectId)).emit("presence:updated", {
        projectId,
        users: presence.list(projectId),
      });
      const current = awareness.get(user.id);
      if (current?.projectId === projectId) {
        awareness.setBoard(user.id, null);
        void notifyTeammates(user.id);
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
        ack?: (res: { peers: ReturnType<typeof calls.list>; sessionId: string; notes: string; whiteboard: unknown[] } | { error: string }) => void,
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

        let sessionId = calls.activeSession(projectId);
        let sessionNotes = "";
        let whiteboard: unknown[] = [];
        if (!sessionId) {
          const session = await prisma.syncRoomSession.create({
            data: {
              projectId,
              contextTaskId: payload.focusTaskId ?? null,
              contextTaskTitle: payload.focusTaskTitle ?? null,
              startedById: user.id,
            },
          });
          sessionId = session.id;
          calls.setActiveSession(projectId, sessionId);
          await prisma.syncRoomEvent.create({
            data: {
              sessionId,
              kind: "session_started",
              label: payload.focusTaskTitle
                ? `SyncRoom opened for “${payload.focusTaskTitle}”`
                : "Project SyncRoom opened",
              userId: user.id,
            },
          });
        } else {
          const existing = await prisma.syncRoomSession.findUnique({
            where: { id: sessionId },
            select: { notes: true, whiteboard: true },
          });
          sessionNotes = existing?.notes ?? "";
          try {
            whiteboard = JSON.parse(existing?.whiteboard || "[]");
          } catch {
            whiteboard = [];
          }
        }

        await prisma.syncRoomEvent.create({
          data: {
            sessionId,
            kind: "peer_joined",
            label: `${user.name} joined`,
            userId: user.id,
          },
        });
        io.to(callRoomFor(projectId)).emit("call:session-event", {
          sessionId,
          event: {
            id: `${Date.now()}`,
            kind: "peer_joined",
            at: new Date().toISOString(),
            label: `${user.name} joined`,
          },
        });

        // Existing peers learn about the newcomer (they will NOT offer — the
        // newcomer initiates to avoid offer glare).
        socket.to(callRoomFor(projectId)).emit("call:peer-joined", { peer: self });
        broadcastRoster(projectId);
        awareness.setSyncRoom(user.id, true, payload.focusTaskTitle ?? null);
        void notifyTeammates(user.id);
        ack?.({ peers, sessionId, notes: sessionNotes, whiteboard });
      },
    );

    socket.on(
      "call:session-event",
      async (payload: { sessionId: string; kind: string; label: string }) => {
        const projectId = calls.projectOf(socket.id);
        if (!projectId || !payload?.sessionId || !payload.kind || !payload.label) return;
        if (calls.activeSession(projectId) !== payload.sessionId) return;

        const event = await prisma.syncRoomEvent.create({
          data: {
            sessionId: payload.sessionId,
            kind: payload.kind,
            label: payload.label,
            userId: user.id,
          },
        });

        io.to(callRoomFor(projectId)).emit("call:session-event", {
          sessionId: payload.sessionId,
          event: {
            id: event.id,
            kind: event.kind,
            at: event.at.toISOString(),
            label: event.label,
          },
        });
      },
    );

    socket.on(
      "call:notes",
      async (payload: { sessionId: string; notes: string }) => {
        const projectId = calls.projectOf(socket.id);
        if (!projectId || !payload?.sessionId) return;
        if (calls.activeSession(projectId) !== payload.sessionId) return;
        const notes = String(payload.notes ?? "").slice(0, 20_000);

        await prisma.syncRoomSession.update({
          where: { id: payload.sessionId },
          data: { notes },
        });

        socket.to(callRoomFor(projectId)).emit("call:notes", {
          sessionId: payload.sessionId,
          notes,
          userId: user.id,
        });
      },
    );

    socket.on(
      "call:whiteboard",
      async (payload: { sessionId: string; strokes: unknown }) => {
        const projectId = calls.projectOf(socket.id);
        if (!projectId || !payload?.sessionId) return;
        if (calls.activeSession(projectId) !== payload.sessionId) return;
        const json = JSON.stringify(payload.strokes ?? []).slice(0, 500_000);

        await prisma.syncRoomSession.update({
          where: { id: payload.sessionId },
          data: { whiteboard: json },
        });

        io.to(callRoomFor(projectId)).emit("call:whiteboard", {
          sessionId: payload.sessionId,
          strokes: JSON.parse(json),
        });
      },
    );

    function leaveCall() {
      const projectId = calls.projectOf(socket.id);
      const sessionId = projectId ? calls.activeSession(projectId) : null;

      if (projectId && sessionId) {
        void prisma.syncRoomEvent
          .create({
            data: {
              sessionId,
              kind: "peer_left",
              label: `${user.name} left`,
              userId: user.id,
            },
          })
          .then((event) => {
            io.to(callRoomFor(projectId)).emit("call:session-event", {
              sessionId,
              event: {
                id: event.id,
                kind: event.kind,
                at: event.at.toISOString(),
                label: event.label,
              },
            });
          })
          .catch(() => {});
      }

      const leftProject = calls.leaveSocket(socket.id);
      if (!leftProject) return;
      socket.leave(callRoomFor(leftProject));
      io.to(callRoomFor(leftProject)).emit("call:peer-left", { socketId: socket.id });
      broadcastRoster(leftProject);

      if (sessionId && calls.list(leftProject).length === 0) {
        void prisma.syncRoomSession
          .update({
            where: { id: sessionId },
            data: { endedAt: new Date() },
          })
          .catch(() => {});
        calls.clearActiveSession(leftProject);
      }

      awareness.setSyncRoom(user.id, false);
      void notifyTeammates(user.id);
    }

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

    socket.on("call:leave", () => leaveCall());

    // Live awareness: which task the user is currently editing/viewing.
    socket.on(
      "task:focus",
      (
        payload: string | null | { taskId: string | null; taskTitle?: string | null },
      ) => {
        const taskId =
          payload === null || typeof payload === "string"
            ? payload
            : (payload.taskId ?? null);
        const taskTitle =
          payload !== null && typeof payload === "object"
            ? (payload.taskTitle ?? null)
            : null;

        const affected = presence.setFocus(socket.id, taskId);
        for (const pid of affected) {
          io.to(roomFor(pid)).emit("presence:updated", {
            projectId: pid,
            users: presence.list(pid),
          });
        }

        if (taskId && taskTitle) {
          awareness.setFocus(user.id, { id: taskId, title: taskTitle });
          void notifyTeammates(user.id);
        } else if (taskId) {
          void prisma.task
            .findUnique({ where: { id: taskId }, select: { title: true } })
            .then((t) => {
              if (t) awareness.setFocus(user.id, { id: taskId, title: t.title });
              void notifyTeammates(user.id);
            });
        } else if (!taskId) {
          awareness.setFocus(user.id, null);
          void notifyTeammates(user.id);
        }
      },
    );

    // Lightweight latency probe used by the client's connectivity meter.
    socket.on("net:ping", (sentAt: number, ack?: (serverTime: number) => void) => {
      if (typeof ack === "function") ack(Date.now());
    });

    socket.on("disconnect", () => {
      leaveCall();
      const affected = presence.leaveSocket(socket.id);
      for (const pid of affected) {
        io.to(roomFor(pid)).emit("presence:updated", {
          projectId: pid,
          users: presence.list(pid),
        });
      }
      const gone = awareness.disconnect(socket.id);
      if (gone) void notifyTeammates(gone);
    });
  });

  return io;
}
