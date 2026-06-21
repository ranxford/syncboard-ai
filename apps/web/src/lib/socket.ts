import { io, type Socket } from "socket.io-client";
import { getToken } from "./api";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    auth: { token: getToken() },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/** Round-trip latency probe used by the connectivity meter. Resolves ms or null. */
export function pingLatency(): Promise<number | null> {
  return new Promise((resolve) => {
    const s = socket;
    if (!s || !s.connected) return resolve(null);
    const start = Date.now();
    const timeout = setTimeout(() => resolve(null), 3000);
    s.emit("net:ping", start, () => {
      clearTimeout(timeout);
      resolve(Date.now() - start);
    });
  });
}
