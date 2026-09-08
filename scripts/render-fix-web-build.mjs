#!/usr/bin/env node
/** Fix Render web builds + stop error spam from old service */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const API_URL = "https://syncboard-api-5g52.onrender.com";
const WEB_URL = "https://syncboard-web-ad21.onrender.com";
const key = JSON.parse(readFileSync(join(homedir(), ".cursor/mcp.json"), "utf8")).mcpServers.render.headers.Authorization.replace("Bearer ", "");

async function api(method, path, body) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}

const services = (await api("GET", "/services?limit=50")).map((x) => x.service);
const web = services.find((s) => s.name === "syncboard-web");
const apiSvc = services.find((s) => s.name === "syncboard-api");
const old = services.find((s) => s.name === "syncboard-ai");

const buildCommand = `npm ci --include=dev && NEXT_PUBLIC_API_URL=${API_URL} NEXT_PUBLIC_SOCKET_URL=${API_URL} npm run build --workspace apps/web`;

if (web) {
  await api("PATCH", `/services/${web.id}`, {
    autoDeploy: "yes",
    serviceDetails: {
      envSpecificDetails: { buildCommand, startCommand: "npm run start --workspace apps/web" },
    },
  });
  for (const [k, v] of [
    ["NEXT_PUBLIC_API_URL", API_URL],
    ["NEXT_PUBLIC_SOCKET_URL", API_URL],
    ["NPM_CONFIG_PRODUCTION", "false"],
  ]) {
    try {
      await api("POST", `/services/${web.id}/env-vars`, { envVar: { key: k, value: v } });
    } catch {
      await api("PUT", `/services/${web.id}/env-vars/${encodeURIComponent(k)}`, { value: v });
    }
  }
  await api("POST", `/services/${web.id}/deploys`, { clearCache: "clear" });
  console.log("Redeploying syncboard-web with fixed build command");
}

if (apiSvc) {
  try {
    await api("PUT", `/services/${apiSvc.id}/env-vars/${encodeURIComponent("WEB_ORIGIN")}`, { value: WEB_URL });
  } catch {
    await api("POST", `/services/${apiSvc.id}/env-vars`, { envVar: { key: "WEB_ORIGIN", value: WEB_URL } });
  }
}

if (old) {
  await api("POST", `/services/${old.id}/suspend`, {}).catch(() => null);
  await api("PATCH", `/services/${old.id}`, { autoDeploy: "no" }).catch(() => null);
  console.log("Suspended syncboard-ai and disabled auto-deploy (stops failure emails)");
}

console.log("Done. Web:", WEB_URL);
