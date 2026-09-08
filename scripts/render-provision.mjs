#!/usr/bin/env node
/**
 * One-time Render provisioning for SyncBoard (API + web).
 * Reads RENDER_API_KEY from ~/.cursor/mcp.json and RESEND_API_KEY from apps/server/.env
 * Usage: node scripts/render-provision.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const API_BASE = "https://api.render.com/v1";
const REPO = "https://github.com/ranxford/syncboard-ai";
const BRANCH = "main";
const OLD_SERVICE_ID = "srv-dafornon74is73avvff0";

function loadRenderKey() {
  const p = join(homedir(), ".cursor/mcp.json");
  const j = JSON.parse(readFileSync(p, "utf8"));
  return j.mcpServers.render.headers.Authorization.replace("Bearer ", "");
}

function loadResendKey() {
  const envPath = join(process.cwd(), "apps/server/.env");
  if (!existsSync(envPath)) return "";
  const line = readFileSync(envPath, "utf8").split("\n").find((l) => l.startsWith("RESEND_API_KEY="));
  return line?.split("=")[1]?.trim() ?? "";
}

async function api(key, method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  return data;
}

async function listServices(key) {
  const data = await api(key, "GET", "/services?limit=50");
  return data.map((x) => x.service);
}

async function findByName(services, name) {
  return services.find((s) => s.name === name);
}

async function createApiService(key, ownerId) {
  return api(key, "POST", "/services", {
    type: "web_service",
    name: "syncboard-api",
    ownerId,
    repo: REPO,
    branch: BRANCH,
    autoDeploy: "yes",
    serviceDetails: {
      env: "docker",
      envSpecificDetails: {
        dockerfilePath: "./apps/server/Dockerfile",
        dockerContext: ".",
      },
      healthCheckPath: "/health",
      plan: "free",
      region: "oregon",
    },
  });
}

async function createWebService(key, ownerId, apiUrl) {
  return api(key, "POST", "/services", {
    type: "web_service",
    name: "syncboard-web",
    ownerId,
    repo: REPO,
    branch: BRANCH,
    autoDeploy: "yes",
    serviceDetails: {
      env: "node",
      envSpecificDetails: {
        buildCommand: "npm ci && npm run build --workspace apps/web",
        startCommand: "npm run start --workspace apps/web",
      },
      healthCheckPath: "/",
      plan: "free",
      region: "oregon",
    },
  });
}

async function setEnvVars(renderKey, serviceId, vars) {
  for (const { key: envKey, value } of vars) {
    try {
      await api(renderKey, "POST", `/services/${serviceId}/env-vars`, {
        envVar: { key: envKey, value },
      });
    } catch {
      try {
        await api(renderKey, "PUT", `/services/${serviceId}/env-vars/${encodeURIComponent(envKey)}`, {
          value,
        });
      } catch (e) {
        console.warn(`  env ${envKey}:`, String(e).slice(0, 120));
      }
    }
  }
}

async function triggerDeploy(key, serviceId) {
  return api(key, "POST", `/services/${serviceId}/deploys`, {});
}

async function suspendService(key, serviceId) {
  return api(key, "POST", `/services/${serviceId}/suspend`, {}).catch(() => null);
}

async function main() {
  const renderKey = loadRenderKey();
  const resendKey = loadResendKey();
  let services = await listServices(renderKey);
  console.log("Existing:", services.map((s) => `${s.name} (${s.id})`).join(", "));

  const ownerId = services[0]?.ownerId ?? "tea-dafojq0u01pc73ba7gg0";

  let apiSvc = await findByName(services, "syncboard-api");
  let webSvc = await findByName(services, "syncboard-api".replace("api", "web"));
  webSvc = await findByName(services, "syncboard-web");

  if (!apiSvc) {
    console.log("Creating syncboard-api (Docker)…");
    const created = await createApiService(renderKey, ownerId);
    apiSvc = created.service ?? created;
    console.log("  →", apiSvc.serviceDetails?.url ?? apiSvc.id);
  }

  services = await listServices(renderKey);
  apiSvc = await findByName(services, "syncboard-api");
  const apiUrl = apiSvc?.serviceDetails?.url;

  if (!webSvc) {
    console.log("Creating syncboard-web (Next.js)…");
    const created = await createWebService(renderKey, ownerId, apiUrl);
    webSvc = created.service ?? created;
    console.log("  →", webSvc.serviceDetails?.url ?? webSvc.id);
  }

  services = await listServices(renderKey);
  apiSvc = await findByName(services, "syncboard-api");
  webSvc = await findByName(services, "syncboard-web");
  const webUrl = webSvc?.serviceDetails?.url;

  console.log("Setting environment variables…");
  const jwt = crypto.randomUUID() + crypto.randomUUID();

  if (apiSvc) {
    await setEnvVars(renderKey, apiSvc.id, [
      { key: "NODE_ENV", value: "production" },
      { key: "JWT_SECRET", value: jwt },
      { key: "DATABASE_URL", value: "file:./apps/server/prisma/dev.db" },
      { key: "AI_PROVIDER", value: "heuristic" },
      { key: "EMAIL_FROM", value: "SyncBoard <onboarding@resend.dev>" },
      { key: "REQUIRE_EMAIL_VERIFICATION", value: "false" },
      { key: "WEB_ORIGIN", value: webUrl ?? "" },
      ...(resendKey ? [{ key: "RESEND_API_KEY", value: resendKey }] : []),
    ]);
  }

  if (webSvc && apiUrl) {
    await setEnvVars(renderKey, webSvc.id, [
      { key: "NODE_ENV", value: "production" },
      { key: "NODE_VERSION", value: "20.18.0" },
      { key: "NEXT_PUBLIC_API_URL", value: apiUrl },
      { key: "NEXT_PUBLIC_SOCKET_URL", value: apiUrl },
    ]);
  }

  console.log("Triggering deploys…");
  if (apiSvc) await triggerDeploy(renderKey, apiSvc.id);
  if (webSvc) await triggerDeploy(renderKey, webSvc.id);

  const old = services.find((s) => s.id === OLD_SERVICE_ID || s.name === "syncboard-ai");
  if (old && old.name === "syncboard-ai") {
    console.log("Suspending old syncboard-ai service…");
    await suspendService(renderKey, old.id);
  }

  console.log("\n✓ Done");
  console.log("  Web:", webUrl ?? "(pending — check dashboard)");
  console.log("  API:", apiUrl ?? "(pending — check dashboard)");
  console.log("  Dashboard: https://dashboard.render.com");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
