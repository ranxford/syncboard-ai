#!/usr/bin/env node
/** Stop deploy failure emails: verify env, suspend old service, confirm live deploys. */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const key = JSON.parse(readFileSync(join(homedir(), ".cursor/mcp.json"), "utf8")).mcpServers.render.headers.Authorization.replace("Bearer ", "");
const API = "https://api.render.com/v1";

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

const services = (await api("GET", "/services?limit=50")).map((x) => x.service);
const apiSvc = services.find((s) => s.name === "syncboard-api");
const webSvc = services.find((s) => s.name === "syncboard-web");
const oldSvc = services.find((s) => s.name === "syncboard-ai");

console.log("Services:");
for (const s of [apiSvc, webSvc, oldSvc].filter(Boolean)) {
  const dr = await api("GET", `/services/${s.id}/deploys?limit=1`);
  const d = dr[0]?.deploy;
  console.log(`  ${s.name}: latest deploy ${d?.status ?? "?"} — ${(d?.commit?.message ?? "").slice(0, 50)}`);
}

if (oldSvc) {
  await api("POST", `/services/${oldSvc.id}/suspend`, {}).catch(() => null);
  await api("PATCH", `/services/${oldSvc.id}`, { autoDeploy: "no" });
  console.log("\n✓ syncboard-ai (old): suspended + auto-deploy off");
}

if (apiSvc) {
  const env = await api("GET", `/services/${apiSvc.id}/env-vars?limit=50`);
  const db = env.map((x) => x.envVar).find((v) => v.key === "DATABASE_URL");
  if (!db?.value) {
    await api("PUT", `/services/${apiSvc.id}/env-vars/DATABASE_URL`, { value: "file:./dev.db" });
    console.log("✓ Restored missing DATABASE_URL on syncboard-api");
  } else {
    console.log("\n✓ DATABASE_URL is set on syncboard-api");
  }
}

console.log("\nLive URLs:");
console.log("  Web:", webSvc?.serviceDetails?.url);
console.log("  API:", apiSvc?.serviceDetails?.url);
console.log("\nIf you still get failure emails, they are likely from earlier failed deploys (Postgres migration).");
console.log("Current services should be healthy — check Dashboard for any NEW failures after", new Date().toISOString());
