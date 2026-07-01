# SyncBoard AI+

**An intelligent real-time collaborative web platform for distributed teams.**

SyncBoard AI+ combines AI-driven workflow analytics, instant WebSocket
synchronization, live presence awareness, and an offline-resilient sync
architecture into a single modern web platform — designed to keep distributed
teams coordinated, even in low-connectivity environments.

---

## 📸 Screenshots

### Landing
A modern marketing page with a live board preview, feature highlights, and clear calls to action.

![SyncBoard AI+ landing page](./docs/screenshots/landing.png)

### Real-time Kanban board
Drag-and-drop columns with priorities, labels, estimates, assignees, live presence, and WIP awareness.

![SyncBoard AI+ Kanban board](./docs/screenshots/board.png)

### AI Insights
Workload balancing, rebalancing suggestions, and predictive risk detection — derived live from board state.

![SyncBoard AI+ AI Insights panel](./docs/screenshots/ai-insights.png)

---

## ✨ Features

| Feature | Description |
| --- | --- |
| **Real-time sync** | Every task change broadcasts instantly over Socket.io — no refresh needed. |
| **Video meetings** | Built-in WebRTC audio/video huddles per board — mute, camera, and screen share, with a live "join" badge when a meeting is in progress. No third-party API. |
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

## 🏗️ Architecture

```mermaid
flowchart LR
  subgraph Browser["Browser — Next.js (apps/web)"]
    UI["Kanban board · AI panel · Meeting modal"]
    Store["Zustand store<br/>(optimistic updates)"]
    OQ["Offline queue<br/>(localStorage)"]
    WSC["Socket.io client"]
    UI --> Store --> OQ
    UI --> WSC
  end

  subgraph Server["API — Express + Socket.io (apps/server)"]
    REST["REST routes<br/>auth · projects · tasks · analytics · ai"]
    JWT["JWT auth"]
    RT["Realtime: rooms · presence · broadcast"]
    AIE["AI engine<br/>heuristic / OpenAI"]
    REST --> JWT
    REST --> AIE
    RT --> AIE
  end

  DB[("Prisma → SQLite / PostgreSQL")]
  REDIS[("Redis (optional)")]
  OAI["OpenAI API (optional)"]

  Store -- "REST (fetch)" --> REST
  OQ -- "replay on reconnect" --> REST
  WSC <-- "WebSocket: board:updated · presence" --> RT
  REST --> DB
  RT --> DB
  RT -.-> REDIS
  AIE -.-> OAI
```

**Data flow:** a user action updates local state optimistically and hits the REST
API; the server persists via Prisma and broadcasts the authoritative board over
Socket.io to everyone in the project room. If the network is down, the change is
queued locally and replayed on reconnect. The AI engine reads board state to
produce predictions, workload analysis, and meeting summaries.

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

## ☁️ Deployment

The app splits cleanly into a static-ish frontend and a stateful realtime API.

### Frontend → Vercel (recommended)
1. Push this repo to GitHub and import it in Vercel.
2. Set **Root Directory** to `apps/web` (Vercel auto-detects Next.js).
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` → your API URL (e.g. `https://syncboard-api.onrender.com`)
   - `NEXT_PUBLIC_SOCKET_URL` → same API URL
4. Deploy.

### API → Render (blueprint included) or Railway
- **Render**: push to GitHub, then *New + → Blueprint* and pick this repo. The
  included [`render.yaml`](./render.yaml) provisions the API from
  [`apps/server/Dockerfile`](./apps/server/Dockerfile) with a persistent disk for
  SQLite and an auto-generated `JWT_SECRET`. Set `WEB_ORIGIN` to your Vercel URL.
- **Any Docker host**: build from the repo root:
  ```bash
  docker build -f apps/server/Dockerfile -t syncboard-api .
  docker run -p 4000:4000 -e JWT_SECRET=... -e WEB_ORIGIN=https://your-web-url syncboard-api
  ```

### Scaling to PostgreSQL + Redis
For production scale, switch the Prisma datasource `provider` to `postgresql`,
point `DATABASE_URL` at managed Postgres, and set `REDIS_URL`. See the commented
sections in `render.yaml` and `docker-compose.yml`.

> **CORS note:** set the API's `WEB_ORIGIN` to your deployed web origin so the
> browser and WebSocket connections are accepted.

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

## 📹 How the video meetings work

Each board has a built-in meeting room powered entirely by **WebRTC** — there is
no Zoom/Twilio/Agora dependency and no media server.

1. The Socket.io server acts purely as a **signaling relay**: it tracks who is in
   each project's call and forwards SDP offers/answers and ICE candidates between
   browsers. **Media never touches the server.**
2. Topology is a **peer-to-peer mesh** — each participant holds one
   `RTCPeerConnection` to every other participant. To avoid offer "glare", the
   newcomer always initiates to existing peers.
3. NAT traversal uses public **STUN** servers. For restrictive networks you can
   add a TURN server to the `iceServers` config in `apps/web/src/store/call.ts`.
4. Controls include mute, camera on/off, and **screen sharing** (via
   `getDisplayMedia` + `RTCRtpSender.replaceTrack`). A live badge on the board
   toolbar shows when a meeting is already in progress so others can hop in.

> Requires `https` in production (or `localhost` in dev) for camera/mic access.

---

## 📜 Scripts

| Command | Description |
| --- | --- |
| `npm run setup` | Install + create DB + seed |
| `npm run dev` | Run web + server together |
| `npm run dev:server` / `npm run dev:web` | Run individually |
| `npm run build` | Build both apps |
| `npm run lint` | Lint the web app (ESLint / next core-web-vitals) |
| `npm run db:seed` | Re-seed demo data |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Run the full server test suite (AI engine + label units + HTTP integration) |

CI runs install → Prisma generate → lint → build → tests on every push/PR (see
[`.github/workflows/ci.yml`](./.github/workflows/ci.yml)). The test suite includes
an HTTP integration layer that spins up the real Express app against a throwaway
SQLite database and exercises auth, projects, tasks/labels, search, comments,
task moves, and cascading project deletion.

## 🔒 Production hardening

- **Security headers** via [Helmet](https://helmetjs.github.io/) (HSTS, `X-Content-Type-Options`,
  `X-Frame-Options`, cross-origin resource policy tuned for the cross-origin web client).
- **Rate limiting** on `/api/auth/login` and `/api/auth/register` to blunt credential
  stuffing / brute force (disabled automatically under `NODE_ENV=test`).
- **Readiness check**: `GET /health` runs a `SELECT 1` and returns `503` if the
  database is unreachable — wire it to your platform's health probe.
- **Graceful shutdown**: `SIGTERM`/`SIGINT` close the HTTP server and disconnect
  Prisma before exit, so rolling deploys drain cleanly.

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
