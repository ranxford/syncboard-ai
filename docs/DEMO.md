# Demo guide (supervisor / presentation)

**Duration:** 5–8 minutes  
**Accounts:** `ada@syncboard.dev` / `grace@syncboard.dev` — password `password123`

## Before you start

```bash
npm run setup   # first time only
npm run dev     # NOT npm run start — dev serves latest code
```

- Web: http://localhost:3000  
- API: http://localhost:4000  
- Use **two browsers** (or normal + incognito) for realtime.

> If the UI looks unchanged, you may be running an old production build. Stop LaunchAgents (`com.syncboard.web` / `com.syncboard.api`) and use `npm run dev`.

---

## Script

### 1. Problem (30 sec)

> “Teams use a board for status and Zoom for calls. Decisions don’t make it back to the board. We close that loop.”

### 2. Landing + dashboard (1 min)

- Show landing: **Discuss → decide → board updated**.
- Log in → **Your workspace**.
- Point out **Teammates right now** (if Grace is online in another browser).

### 3. Board + realtime (1 min)

- Open **SyncBoard Launch** project.
- Drag a card — show it move on the second browser.
- Open **AI Insights** — stalled/overdue signals, **one-click** actions.

### 4. SyncRoom closed loop (3 min) — *the main demo*

1. Open a task → **Live discussion (SyncRoom)**.
2. Join call; show **task spotlight**, **live notes**, optional **whiteboard**.
3. Move a card while in-call (session replay will log it).
4. Leave → **Generate AI summary** → **Apply outcomes to board**.
5. Reopen task — comment + history + new backlog items.

### 5. Alignment + submit gate (1 min)

- **Ada (admin):** **Alignment** → project standard → team scores + **Member submissions** → **Generate review brief**.
- **Linus (member):** attach **Figma link or export** under **Review deliverables** → **Submit for review** (blocked until requirements met).
- Admin sees files + AI brief (sources + alignment) — accept or request revision.
- No API keys — heuristic coach text is generated automatically.

### 6. Collaboration model (1 min)

> “Projects are invite-only — not one global community. But teammates see each other live across projects they share.”

---

## Likely questions

| Question | Answer |
| --- | --- |
| How is this different from Trello? | Real-time + AI actions + SyncRoom that updates the board. |
| How is this different from Zoom? | Calls are tied to tasks; outcomes apply to cards. |
| One shared space for everyone? | No — per-project invites; dashboard shows shared teammates. |
| Is the AI real? | Heuristic alignment + analytics by default (no keys); optional OpenAI locally. |
| Who sets requirements? | Admin sets **project standard** once; AI checks each member before submit. |
| Production ready? | Strong prototype; Postgres deploy path documented in README. |

---

## What not to claim

- Enterprise scale WebRTC (mesh works for small teams).
- Full Jira-style workflows.
- Screen recording in session replay (links/notes yes; video recording no).
