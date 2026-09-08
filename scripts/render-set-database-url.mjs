#!/usr/bin/env node
/**
 * Set syncboard-api DATABASE_URL on Render (Postgres internal URL from Dashboard → Connect tab).
 * Usage: node scripts/render-set-database-url.mjs "postgresql://..."
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const url = process.argv[2];
if (!url?.startsWith("postgres")) {
  console.error("Usage: node scripts/render-set-database-url.mjs \"postgresql://user:pass@host/db\"");
  process.exit(1);
}

const key = JSON.parse(readFileSync(join(homedir(), ".cursor/mcp.json"), "utf8")).mcpServers.render.headers.Authorization.replace("Bearer ", "");
const serviceId = "srv-dafp8k8u01pc73bcr1r0";
const API = "https://api.render.com/v1";

const res = await fetch(`${API}/services/${serviceId}/env-vars/DATABASE_URL`, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({ value: url }),
});
if (!res.ok) {
  console.error("Failed:", res.status, await res.text());
  process.exit(1);
}

await fetch(`${API}/services/${serviceId}/deploys`, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
});

console.log("✓ DATABASE_URL updated and API redeploy triggered.");
