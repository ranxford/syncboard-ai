# SyncBoard AI+

**An intelligent real-time collaborative web platform for distributed teams.**

SyncBoard AI+ combines AI-driven workflow analytics, instant WebSocket
synchronization, live presence awareness, and an offline-resilient sync
architecture into a single modern web platform — designed to keep distributed
teams coordinated, even in low-connectivity environments.

---

## ✨ Features

| Feature | Description |
| --- | --- |
| **Real-time sync** | Every task change broadcasts instantly over Socket.io — no refresh needed. |
| **Live presence** | See who's online and which task each teammate is editing, in real time. |
| **AI workflow prediction** | Detects stalled tasks, deadline risk, and WIP-limit breaches before they hurt delivery. |
| **Smart task rebalancing** | Recommends optimal task reassignment based on live workload analysis. |
| **AI meeting intelligence** | Summarizes meeting notes and extracts action items into tasks. |
| **Productivity analytics** | Completion rate, cycle time, throughput, and team workload at a glance. |
| **Offline resilience** | Edits made while offline are queued locally and synced automatically on reconnect. |
| **Connectivity meter** | Live latency / online / offline indicator with queued-change count. |

---

## 🧱 Tech Stack

**Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Zustand, Socket.io client
**Backend:** Node.js, Express, Socket.io, TypeScript
**Database:** Prisma ORM — SQLite by default (zero infra), PostgreSQL-ready
**AI:** Pluggable engine — deterministic heuristic provider (default) or OpenAI
**Infra (optional):** Redis + PostgreSQL via Docker Compose

---

## 📦 Project structure

```
syncboard-ai/
├─ apps/
│  ├─ server/            # Express + Socket.io + Prisma API
│  │  ├─ prisma/         # schema.prisma + seed
│  │  └─ src/
│  │     ├─ ai/          # heuristic + OpenAI providers (predictions, summaries)
│  │     ├─ routes/      # auth, projects, tasks, analytics, ai
│  │     ├─ realtime/    # socket.io, presence, emitter
│  │     ├─ lib/         # jwt, access control, board state
│  │     └─ index.ts
│  └─ web/               # Next.js app
│     └─ src/
│        ├─ app/         # landing, login, dashboard, board/[id]
│        ├─ components/  # KanbanBoard, AIPanel, MeetingModal, PresenceBar…
│        ├─ store/       # zustand auth + board stores (optimistic + offline)
│        └─ lib/         # api client, socket client, offline queue
├─ docker-compose.yml    # optional Postgres + Redis
└─ package.json          # npm workspaces + scripts
```

---

## 🚀 Getting started

### Prerequisites
- **Node.js ≥ 18.18** (v20 LTS recommended) and npm

> If Node isn't installed yet, see [Installing Node.js](#-installing-nodejs) below.

### 1. Install & set up (one command)

```bash
npm run setup
```

This installs dependencies, generates the Prisma client, creates the local
SQLite database, and seeds demo data.

> Equivalent to: `npm install && npm run db:setup && npm run db:seed`

### 2. Run the app

```bash
npm run dev
```

- Web app → http://localhost:3000
- API + WebSocket server → http://localhost:4000

### 3. Sign in with a demo account

| Email | Password | Role |
| --- | --- | --- |
| `ada@syncboard.dev` | `password123` | owner |
| `grace@syncboard.dev` | `password123` | member |
| `linus@syncboard.dev` | `password123` | member |

The seeded **SyncBoard Launch** project is preloaded with tasks that trigger
real AI insights (a stalled task, an overdue task, an approaching deadline, and
an overloaded teammate). Open **AI Insights** to see them.

---

## 🔌 Environment variables

Local `.env` files are created for you (`apps/server/.env`, `apps/web/.env.local`).
See [`.env.example`](./.env.example) for the full reference.

Key options:

- `AI_PROVIDER` — `heuristic` (default, no key) or `openai`
- `OPENAI_API_KEY` — required only when `AI_PROVIDER=openai`
- `DATABASE_URL` — SQLite by default; switch to Postgres for production
- `REDIS_URL` — optional; enables Redis (in-memory fallback otherwise)

### Enabling OpenAI

```env
# apps/server/.env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

Board predictions stay deterministic/explainable; OpenAI powers meeting
summarization and action-item extraction.

---

## 🐘 Using PostgreSQL + Redis (production-like)

```bash
docker compose up -d
```

Then in `apps/server/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/syncboard?schema=public"
REDIS_URL="redis://localhost:6379"
```

And change the datasource provider in `apps/server/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then re-run `npm run db:setup && npm run db:seed`.

---

## 🧪 How the offline resilience works

1. Every board mutation is applied **optimistically** to local state.
2. The change is sent to the server. On success, the server's authoritative
   board state is broadcast to all connected clients.
3. If the network is unavailable, the operation is persisted to a
   **localStorage-backed queue** and the UI shows an *offline* badge with the
   pending count.
4. When connectivity returns (browser `online` event or socket reconnect), the
   queue is **replayed in order** and the board reconverges with the server.

---

## 📜 Scripts

| Command | Description |
| --- | --- |
| `npm run setup` | Install + create DB + seed |
| `npm run dev` | Run web + server together |
| `npm run dev:server` / `npm run dev:web` | Run individually |
| `npm run build` | Build both apps |
| `npm run db:seed` | Re-seed demo data |
| `npm run db:studio` | Open Prisma Studio |

---

## 🟢 Installing Node.js

**macOS (Homebrew):**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node
```

**Or via nvm (any OS):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# restart your shell, then:
nvm install --lts
```

Verify: `node -v` (should print v18.18+).

---

## 📄 License

Educational / final-year project demo.
