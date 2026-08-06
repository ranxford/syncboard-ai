# Local setup for your team

Each teammate runs their **own copy** on `localhost` with the full feature set: board,
SyncRoom, AI insights, alignment, review deliverables, and file uploads. No cloud keys
required.

## 1. Get the code

```bash
git clone https://github.com/ranxford/syncboard-ai.git
cd syncboard-ai
git checkout main   # latest full codebase
```

## 2. One-command setup

```bash
npm run setup
```

This will:

1. Install dependencies (`npm install`)
2. Create `apps/server/.env` and `apps/web/.env.local` from examples (if missing)
3. Create the local SQLite database (`apps/server/prisma/dev.db`)
4. Seed demo users, the **SyncBoard Launch** project, tasks, and milestones

**Requirements:** Node.js **≥ 18.18** (v20 LTS recommended). Check with `node -v`.

## 3. Start the app

```bash
npm run dev
```

| Service | URL |
| --- | --- |
| Web app | http://localhost:3000 |
| API + WebSocket | http://localhost:4000 |

Use **`npm run dev`**, not `npm run start`, while developing — `dev` serves the
latest TypeScript without a separate build step.

### Port already in use?

```bash
npm run dev:clean
```

## 4. Sign in

All demo accounts use password **`password123`** (emails are pre-verified):

| Email | Role | Good for testing |
| --- | --- | --- |
| `ada@syncboard.dev` | owner | Admin: alignment, submission inbox, review briefs |
| `grace@syncboard.dev` | admin | Second admin / collaborator |
| `linus@syncboard.dev` | member | Member submit flow, deliverables, personal timeline |

After seed, open the shared board from the dashboard (**SyncBoard Launch**) or run
`npm run db:seed` again to print the direct board URL.

## 5. Try everything locally

| Feature | How |
| --- | --- |
| Real-time board | Open the same board in two browsers (normal + incognito), log in as Ada and Grace |
| AI Insights | Board → **Tools** → **AI insights** (or `/board/<id>?insights=1`) |
| SyncRoom | Board toolbar **SyncRoom** — allow camera/mic when prompted (`localhost` is OK) |
| Review deliverables | Linus → **Tools** → **Deliverables** → upload/link → **Submit for review** |
| Admin review | Ada → **Submission inbox** → generate review brief |
| Alignment | Ada → **Tools** → **Alignment** → set project standard |
| File uploads | Stored under `apps/server/uploads/review/` (gitignored, created on setup) |

See [DEMO.md](./DEMO.md) for a 5–8 minute walkthrough script.

## 6. Reset demo data

```bash
npm run db:seed
```

Replaces all tasks/users with the default demo dataset.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Blank board / API errors | Confirm both terminals show server + web running; check `apps/server/.env` exists |
| “Network unavailable” on login | API not running — wait for `http://localhost:4000/health` |
| UI looks outdated | Stop any old LaunchAgent/production process; use `npm run dev:clean` |
| SyncRoom no camera | Use Chrome/Edge; grant permissions; stay on `http://localhost:3000` |
| Submit blocked | Open **Deliverables**, attach files/links; check alignment requirements (Linus = UI/UX track) |
| Missing `.env` files | Run `node scripts/bootstrap-env.mjs` |

## Optional

- **OpenAI:** set `AI_PROVIDER=openai` and `OPENAI_API_KEY` in `apps/server/.env` (not required).
- **Postgres + Redis:** see README → “Using PostgreSQL + Redis”.
- **Refresh README screenshots:** `node scripts/capture-screenshots.mjs` (dev server must be running).

## What each person gets

Every clone is **independent** — your SQLite DB is local. Two teammates on different
laptops each see the full app, but they do **not** share live board updates unless
they point at the same API (e.g. one person runs the server and others set
`NEXT_PUBLIC_API_URL` to that machine’s LAN IP — advanced; not needed for solo demos).
