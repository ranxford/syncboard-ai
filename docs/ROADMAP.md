# Roadmap & status

Last updated: project feature-complete for demo/MVP scope.

## ✅ Shipped

### Core board
- Auth, projects, invite-by-email members
- **Email confirmation** (demo token flow; login gated until confirmed)
- **Personal vs shared** project visibility (personal workspace vs invite-only **community**)
- **Team management** — roles (owner/admin/member), remove member, pending invites
- Kanban CRUD, drag-drop, search, filters
- Real-time sync, presence, activity feed
- Offline queue + connectivity meter
- Board zoom (60–150%, persisted per project)
- **Community + personal timelines** — shared track for the group; each collaborator has their own; admins see all
- **Team session** — SyncRoom button to work the shared community timeline together
- **Ideas & suggestions** — submit, upvote, promote to Backlog

### AI
- Heuristic analytics (stagnation, deadlines, WIP, workload) — **default; no API keys**
- **Project alignment** — admin sets project standard; automatic coach feedback per member
- **Submit gate** — members submit deliverables only after AI readiness check passes
- One-click insight actions
- Meeting notes import modal
- Proactive board nudges (toast when new risks appear)
- Optional OpenAI locally (`AI_PROVIDER=openai`) — not required for git or demos

### SyncRoom
- WebRTC A/V + screen share
- Task-scoped entry + presence prompts
- Live collaborative notes
- Session replay (shared, persisted)
- Apply outcomes to board
- Task discussion history
- Task spotlight in call panel
- Collaborative whiteboard (session-scoped)
- Session artifacts (links saved to session)
- **Review deliverables** — members attach Figma links/exports and files; admins get NotebookLM-style AI review briefs on submit

### Collaboration
- Private per-project access
- Cross-project teammate awareness (dashboard)
- SyncRoom start notifications for shared teammates

### Docs
- README, COLLABORATION, ARCHITECTURE, DEMO, ROADMAP

## 🔜 Future (out of MVP scope)

- Real SMTP for confirmation emails (Resend / SES)
- Screen recording in session replay
- PDF text extraction for deeper review briefs (OpenAI optional)
- Redis-backed presence at scale
- E2E tests for WebRTC flows
- Mobile-optimised SyncRoom UI
- Email notifications for @mentions / overdue

## 🚫 Explicitly not planned

- Single global community board for all users
- Replacing Jira/Linear for enterprise PM
