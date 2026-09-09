#!/usr/bin/env node
/** Push DeepSeek env vars from apps/server/.env to syncboard-api on Render. */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { config } from "dotenv";

const API = "https://api.render.com/v1";
const ENV_PATH = join(process.cwd(), "apps/server/.env");

if (!existsSync(ENV_PATH)) {
  console.error("Missing apps/server/.env");
  process.exit(1);
}

config({ path: ENV_PATH });

const deepseekKey = (process.env.DEEPSEEK_API_KEY ?? "").trim();
if (!deepseekKey) {
  console.error("DEEPSEEK_API_KEY must be set in apps/server/.env");
  process.exit(1);
}

const vars = [
  ["AI_PROVIDER", "deepseek"],
  ["DEEPSEEK_API_KEY", deepseekKey],
  ["DEEPSEEK_MODEL", process.env.DEEPSEEK_MODEL ?? "deepseek-chat"],
];

const key = JSON.parse(
  readFileSync(join(homedir(), ".cursor/mcp.json"), "utf8"),
).mcpServers.render.headers.Authorization.replace("Bearer ", "");

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

async function setVar(serviceId, envKey, value) {
  try {
    await api("POST", `/services/${serviceId}/env-vars`, {
      envVar: { key: envKey, value },
    });
  } catch {
    await api("PUT", `/services/${serviceId}/env-vars/${encodeURIComponent(envKey)}`, {
      value,
    });
  }
}

const services = (await api("GET", "/services?limit=50")).map((x) => x.service);
const apiSvc = services.find((s) => s.name === "syncboard-api");
if (!apiSvc) throw new Error("syncboard-api not found on Render");

console.log(`Updating DeepSeek on ${apiSvc.name} (${apiSvc.id})…`);
for (const [k, v] of vars) {
  await setVar(apiSvc.id, k, v);
  console.log(`  ✓ ${k}`);
}

await api("POST", `/services/${apiSvc.id}/deploys`, {});
console.log("\n✓ Redeploy triggered — check /health for ai: deepseek");
console.log("  API:", apiSvc.serviceDetails?.url ?? "https://syncboard-api-5g52.onrender.com");
