# Deploy SyncBoard to Render (API + Web)

This gets you **two public URLs**:

| Service | Example URL | Purpose |
| --- | --- | --- |
| **syncboard-web** | `https://syncboard-web.onrender.com` | App users open this |
| **syncboard-api** | `https://syncboard-api.onrender.com` | REST + WebSockets |

**Resend** verification emails link to `WEB_ORIGIN/verify?...` — that is the **web** URL, not the API.

---

## Before you start

1. Code is pushed to GitHub: https://github.com/ranxford/syncboard-ai  
2. [Render account](https://render.com) (free tier works)  
3. [Resend account](https://resend.com) with an API key  

---

## Step 1 — Push latest code

Render builds from GitHub. Make sure `render.yaml`, email auth, and `/verify` are on the branch you deploy.

```bash
git push origin HEAD
```

Deploy from `main` or your feature branch — pick the same branch in the Render blueprint.

---

## Step 2 — Create the Blueprint

1. [Render Dashboard](https://dashboard.render.com) → **New +** → **Blueprint**
2. Connect **ranxford/syncboard-ai**
3. Select branch (e.g. `main` or `cursor/board-video-meetings`)
4. Render reads `render.yaml` and creates **syncboard-api** + **syncboard-web**
5. When asked for **RESEND_API_KEY**, paste your key from [resend.com/api-keys](https://resend.com/api-keys)

First deploy takes ~5–10 minutes (Docker build for API, Next.js build for web).

### Complete environment variable cheat sheet

**You only type one value at Blueprint sync** — everything else is pre-filled in `render.yaml` or wired automatically.

| Variable | Service | You enter? | Value to use |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | API | **Yes** | `re_...` from [resend.com/api-keys](https://resend.com/api-keys) |
| `JWT_SECRET` | API | No | Render generates |
| `NODE_ENV` | Both | No | `production` |
| `DATABASE_URL` | API | No | `file:./dev.db` |
| `AI_PROVIDER` | API | No | `heuristic` |
| `OPENAI_API_KEY` | API | No | leave empty |
| `OPENAI_MODEL` | API | No | `gpt-4o-mini` |
| `EMAIL_FROM` | API | No | `SyncBoard <onboarding@resend.dev>` |
| `WEB_ORIGIN` | API | No | Auto → `https://syncboard-web.onrender.com` |
| `NEXT_PUBLIC_API_URL` | Web | No | Auto → `https://syncboard-api.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL` | Web | No | Same as API URL |
| `NODE_VERSION` | Web | No | `20.18.0` |
| `PORT` | Both | No | Render sets automatically |

**Why not put the Resend key in `render.yaml`?** It would be committed to GitHub and anyone could steal it. Render’s `sync: false` prompts you once and stores it securely.

**Why not hard-code URLs?** Your exact URLs (`syncboard-web.onrender.com`, etc.) do not exist until Render creates the services. The blueprint links them with `fromService` after the first deploy.

---

## Step 3 — First deploy quirks

**Linked URLs:** `render.yaml` wires:

- `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` → API’s `RENDER_EXTERNAL_URL`
- `WEB_ORIGIN` → web’s `RENDER_EXTERNAL_URL`

On the very first sync, one service may deploy before the other. If login works but CORS errors appear, or emails link to the wrong host:

1. Open **syncboard-api** → **Environment**
2. Confirm `WEB_ORIGIN` = `https://syncboard-web.onrender.com` (your actual web URL)
3. **Manual Deploy** → **Deploy latest commit** on **both** services

---

## Step 4 — Resend setup

### Free tier (quick test)

- `EMAIL_FROM`: `SyncBoard <onboarding@resend.dev>` (already in `render.yaml`)
- Emails only deliver to the **email address on your Resend account** until you verify a domain

### Production (any recipient)

1. Resend → **Domains** → add your domain (e.g. `syncboard.dev`)
2. Add the DNS records Resend shows (TXT, MX, etc.)
3. In Render **syncboard-api** env:
   - `EMAIL_FROM` = `SyncBoard <noreply@yourdomain.com>`
4. Redeploy API

### Test email

After deploy, register on the **web** URL with your email, or run locally pointing at production API:

```bash
RESEND_API_KEY=re_xxx EMAIL_FROM="SyncBoard <onboarding@resend.dev>" \
  node scripts/test-email.mjs you@gmail.com
```

---

## Step 5 — Smoke test

Open `https://syncboard-web.onrender.com` (your web URL):

- [ ] Landing page loads
- [ ] `https://syncboard-api.onrender.com/health` returns `{"status":"ok",...}`
- [ ] Register → signed in immediately (no email verification until domain is verified)
- [ ] Sign in with existing account

**Free tier cold start:** API may sleep after ~15 min idle; first request can take 30–60s.

---

## Environment reference

### syncboard-api

| Variable | Set by | Notes |
| --- | --- | --- |
| `JWT_SECRET` | Render (auto) | Do not change casually |
| `WEB_ORIGIN` | Blueprint link | Must match web URL exactly |
| `DATABASE_URL` | Blueprint | SQLite on persistent disk |
| `RESEND_API_KEY` | You at sync | Only needed when `REQUIRE_EMAIL_VERIFICATION=true` |
| `EMAIL_FROM` | Blueprint default | Change after domain verify |
| `REQUIRE_EMAIL_VERIFICATION` | Blueprint | `false` — set `true` after Resend domain verify |
| `AI_PROVIDER` | Blueprint | `heuristic` (no OpenAI key needed) |

### syncboard-web

| Variable | Set by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Blueprint link | Baked in at build time |
| `NEXT_PUBLIC_SOCKET_URL` | Blueprint link | Same as API URL |

If you change `NEXT_PUBLIC_*`, **redeploy syncboard-web** (rebuild required).

---

## Optional — demo seed data

Production starts with an empty database. To load Ada/Grace/Linus demo accounts, open **syncboard-api** → **Shell** (paid plans) or run seed locally against production DB (not recommended).

Easier: register real accounts through signup (verification is off until you enable it).

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| CORS / login blocked | `WEB_ORIGIN` on API must exactly match web URL (no trailing slash) |
| WebSocket fails | `NEXT_PUBLIC_SOCKET_URL` must match API URL; redeploy web |
| Email not sent | Check `RESEND_API_KEY` on API; check Render logs |
| Resend 403 / domain | Free tier → send only to Resend account email |
| Verify link goes to localhost | `WEB_ORIGIN` wrong on API — set to web Render URL |
| 502 on API | Check logs; disk mount path; wait for cold start |

---

## Custom domain (later)

1. Render → **syncboard-web** → **Settings** → **Custom Domains**
2. Update `WEB_ORIGIN` on API to `https://yourdomain.com`
3. Redeploy API
4. Add the same domain in Resend for `EMAIL_FROM`
