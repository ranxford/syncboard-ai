# Complete source code map

Everything you write and run is under **`apps/`**. The repo has **164 app files**
(93 frontend + 57 backend + config). GitHub shows fewer items at the repo root
because code lives in a monorepo layout — not because files are missing.

## Quick links (GitHub `main` branch)

| Area | Browse on GitHub |
| --- | --- |
| **Frontend pages** | [apps/web/src/app](https://github.com/ranxford/syncboard-ai/tree/main/apps/web/src/app) |
| **Frontend components** | [apps/web/src/components](https://github.com/ranxford/syncboard-ai/tree/main/apps/web/src/components) |
| **Frontend lib + stores** | [apps/web/src/lib](https://github.com/ranxford/syncboard-ai/tree/main/apps/web/src/lib), [store](https://github.com/ranxford/syncboard-ai/tree/main/apps/web/src/store) |
| **Backend API routes** | [apps/server/src/routes](https://github.com/ranxford/syncboard-ai/tree/main/apps/server/src/routes) |
| **Backend AI** | [apps/server/src/ai](https://github.com/ranxford/syncboard-ai/tree/main/apps/server/src/ai) |
| **WebSocket / SyncRoom** | [apps/server/src/realtime](https://github.com/ranxford/syncboard-ai/tree/main/apps/server/src/realtime) |
| **Database schema + seed** | [apps/server/prisma](https://github.com/ranxford/syncboard-ai/tree/main/apps/server/prisma) |

## What is in git vs what is not

| In the repository (your source code) | Not in git (generated locally) |
| --- | --- |
| All `.ts` / `.tsx` / `.css` under `apps/` | `node_modules/` — run `npm install` |
| Prisma schema + seed script | `apps/server/prisma/dev.db` — run `npm run db:setup` |
| Docker, env **examples** | `.env`, `.env.local` — run `npm run setup` |
| Docs + screenshots | `.next/`, `dist/` — build output |
| | `apps/server/uploads/` — uploaded review files |

After `npm run setup`, your machine will have **thousands** of extra files in
`node_modules`. That is normal — those are library dependencies, not missing project code.

## Frontend (`apps/web`) — 93 files

```
apps/web/src/
├── app/                    # Next.js pages
│   ├── page.tsx            # Landing
│   ├── login/ signup/
│   ├── dashboard/
│   └── board/[id]/         # Kanban board
├── components/             # UI (41 top-level + subfolders)
│   ├── KanbanBoard.tsx, TaskCard.tsx, AIPanel.tsx, CallPanel.tsx…
│   ├── call/               # SyncRoom video UI
│   ├── syncroom/           # Notes, whiteboard, wrap-up
│   └── landing/            # Marketing page
├── lib/                    # API client, socket, WebRTC, types
└── store/                  # Zustand (auth, board, call)
```

## Backend (`apps/server`) — 57 files

```
apps/server/src/
├── index.ts, app.ts        # Express entry + middleware
├── routes/                 # REST API
│   ├── auth.ts, projects.ts, tasks.ts
│   ├── alignment.ts, submissions.ts, reviewSources.ts
│   ├── syncroom.ts, dashboard.ts, analytics.ts, ai.ts…
├── ai/                     # Heuristic + OpenAI providers
│   ├── alignment.ts, codeReview.ts, reviewBrief.ts, heuristic.ts
├── realtime/               # Socket.io
│   ├── socket.ts, presence.ts, calls.ts, awareness.ts
└── lib/                    # Board state, uploads, access control
    ├── board.ts, reviewStorage.ts, submissionReadiness.ts…
```

## See everything in VS Code after clone

```bash
git clone https://github.com/ranxford/syncboard-ai.git
cd syncboard-ai
git checkout main
npm run setup
code .
```

In the Explorer sidebar:

1. Expand **`apps`**
2. Expand **`web/src`** — all frontend source
3. Expand **`server/src`** — all backend source
4. After setup, **`node_modules`** appears too (dependencies)

## Verify your clone matches GitHub

```bash
git ls-files apps/ | wc -l    # should print 164
```

If the number is lower, run `git checkout main` and `git pull origin main`.
