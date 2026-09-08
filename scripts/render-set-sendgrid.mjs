#!/usr/bin/env node
/** Push SendGrid env vars to syncboard-api on Render. Usage: SENDGRID_API_KEY=SG.xxx node scripts/render-set-sendgrid.mjs */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { config } from "dotenv";

const ENV_PATH = join(process.cwd(), "apps/server/.env");
if (existsSync(ENV_PATH)) config({ path: ENV_PATH });

const sendgridKey = (process.env.SENDGRID_API_KEY ?? "").trim();
if (!sendgridKey) {
  console.error("Set SENDGRID_API_KEY in the environment or apps/server/.env");
  process.exit(1);
}

const emailFrom =
  process.env.EMAIL_FROM?.trim() || "SyncBoard <marlinkarp@hotmail.com>";

const vars = [
  ["EMAIL_PROVIDER", "sendgrid"],
  ["SENDGRID_API_KEY", sendgridKey],
  ["EMAIL_FROM", emailFrom],
  ["REQUIRE_EMAIL_VERIFICATION", "false"],
];

const key = JSON.parse(
  readFileSync(join(homedir(), ".cursor/mcp.json"), "utf8"),
).mcpServers.render.headers.Authorization.replace("Bearer ", "");

async function api(method, path, body) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
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
if (!apiSvc) throw new Error("syncboard-api not found");

console.log(`Configuring SendGrid on ${apiSvc.name}…`);
for (const [k, v] of vars) {
  await setVar(apiSvc.id, k, v);
  console.log(`  ✓ ${k}`);
}

await api("POST", `/services/${apiSvc.id}/deploys`, {});
console.log("\n✓ Redeploy triggered — production email via SendGrid (HTTPS)");
