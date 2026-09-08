import { io, type Socket } from "socket.io-client";
import { getToken } from "./api";
import { getSocketUrl } from "./runtimeConfig";

let socket: Socket | null = null;
let socketUrl: string | null = null;

export function getSocket(): Socket {
  const url = getSocketUrl();
  if (socket && socketUrl !== url) {
    socket.disconnect();
    socket = null;
  }
  if (socket) return socket;
  socketUrl = url;
  socket = io(url, {
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
