/**
 * Copy committed .env examples into place on first setup.
 * Safe to re-run — never overwrites existing files.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const pairs = [
  {
    example: join(ROOT, "apps/server/.env.example"),
    target: join(ROOT, "apps/server/.env"),
    label: "apps/server/.env",
  },
  {
    example: join(ROOT, "apps/web/.env.local.example"),
    target: join(ROOT, "apps/web/.env.local"),
    label: "apps/web/.env.local",
  },
];

for (const { example, target, label } of pairs) {
  if (existsSync(target)) {
    console.log(`  ✓ ${label} (already exists)`);
    continue;
  }
  copyFileSync(example, target);
  console.log(`  + created ${label} from example`);
}

mkdirSync(join(ROOT, "apps/server/uploads/review"), { recursive: true });
console.log("  + ensured apps/server/uploads/review/");
