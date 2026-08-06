# How collaboration works in SyncBoard AI+

This document explains who sees what — useful for demos, supervision, and onboarding.

## The short version

- **Not one global community for all users.** Communities (projects) are **invite-only**.
- **You are the admin** of communities you create. Invite collaborators by email — they see the board and community activity; you see what each of them is doing.
- **Separate timelines per collaborator.** Everyone keeps a personal timeline inside the community so nobody feels blocked. Admins can open each member’s timeline.
- **Shared community timeline** for the group’s overall plan (Planning → Build → Launch).
- **Team session** pulls everyone onto the shared track via SyncRoom when you need many hands (deadlines, crunch).

## Accounts and communities

| Concept | What it means |
| --- | --- |
| **User** | One person, one login (email + password, confirmed). |
| **Community / project** | Invite-only kanban board + timelines. |
| **Personal workspace** | Private board — only you (until you invite someone, which converts it to a community). |
| **Membership** | Role: `owner` (admin), `admin`, or `member`. |
| **Community timeline** | Shared milestones for the whole group (`ownerId` null). |
| **Personal timeline** | Each collaborator’s own milestones inside that community. |
| **Team session** | SyncRoom on the community board — work the shared track together live. |

A user can belong to many communities. Community A and B are fully separate unless someone is a member of both.

## What collaborators see

### On a community board

- The shared kanban (tasks, columns) — everyone invited sees the same board work.
- **Shared community timeline** + **their own personal timeline**.
- Live presence: who is online and which task they’re on.
- Activity feed as people move cards and update work.

### What the admin sees (extra)

- Every collaborator’s **personal timeline** (tabs under Community timelines).
- Team panel: roles, invites, remove members.
- Same live board + activity as everyone else.

### On the dashboard

- **Teammates right now** across communities you share.
- Personal vs Community project badges.

### What they cannot see

- Communities they were not invited to.
- Other users’ personal workspaces.
- Other collaborators’ personal timelines (unless they are owner/admin).

## Team session (many hands)

When a deadline needs coordinated effort:

1. Open the community board → **Team session** (or task SyncRoom).
2. Everyone joins the SyncRoom — shared notes, whiteboard, board edits logged.
3. Work the **shared community timeline** and board together.
4. Wrap-up → AI summary → apply outcomes back to the board.

Personal timelines stay available before/after so people are not stuck waiting on the group track.

## Comparison with “one big open community”

| Open global community | SyncBoard communities |
| --- | --- |
| Anyone can see everything | Only invited collaborators |
| One timeline for all | Shared + per-person timelines |
| Hard to separate teams | Clean per-community isolation |
| No clear admin | Owner/admin invites and oversees |

## Demo tip for supervisors

Use two browsers (Ada = admin, Grace = collaborator) on **SyncBoard Launch**:

1. Ada opens **Community timelines** → shows Shared + Ada / Grace / Linus tabs.
2. Grace edits **My timeline** freely; Ada can still see Grace’s tab.
3. Start **Team session** → both join SyncRoom on the shared track.
4. Invite flow: Team panel → invite by email (pending if no account yet).

## Requirement alignment & submit gate

Owners and admins publish a **manager requirements** brief (**Alignment** on community boards). Each **Member** must pass an **AI check** against that brief before **Submit my deliverable** is enabled.

The check uses open **assigned tasks** and **personal timeline** text (keyword overlap — explainable, not a black-box LLM).

| Role | What you get |
| --- | --- |
| **Owner / admin** | Edit brief, see team scores, open deliverables, **Generate review brief**, **Accept** or **Request revision**. |
| **Member** | See blockers, attach **Figma/files**, fix work until the check passes, then submit to admin. |

**Submit rules:** brief published, work items present, score ≥ 60%, not off-track. The **AI review check** bar on the board re-runs automatically as tasks change; marking **Wrapped up** on a personal timeline also triggers the gate.
