/** Runtime API/socket URLs — injected from the server layout on Render/Vercel. */
declare global {
  interface Window {
    __SYNCBOARD_CONFIG__?: { apiUrl: string; socketUrl: string };
  }
}

const LOCAL_API = "http://localhost:4000";

export function getApiUrl(): string {
  if (typeof window !== "undefined" && window.__SYNCBOARD_CONFIG__?.apiUrl) {
    return window.__SYNCBOARD_CONFIG__.apiUrl;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? LOCAL_API;
}

export function getSocketUrl(): string {
  if (typeof window !== "undefined" && window.__SYNCBOARD_CONFIG__?.socketUrl) {
    return window.__SYNCBOARD_CONFIG__.socketUrl;
  }
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? getApiUrl();
}

/** Values for SSR / layout injection (Render env at runtime, not build time). */
export function getServerRuntimeConfig() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? LOCAL_API;
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? apiUrl;
  return { apiUrl, socketUrl };
}
