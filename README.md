# RKL ProjectHub

Project document and progress management portal for **PT Rajasa Kemenangan Logistik**.

Full requirements and locked decisions: [`Planning/RKL Project Management Portal.md`](./Planning/RKL%20Project%20Management%20Portal.md)
Data model draft: [`Planning/schema.draft.prisma`](./Planning/schema.draft.prisma)

---

## Current phase

> **PHASE A — DEMO.**
> Runs locally. Database on Supabase. Not yet shown to end users, not yet on a server.
>
> When the client approves and asks to go live, jump to
> [Go-Live Migration](#go-live-migration) below. Nothing else in the codebase should
> need to change.

| | Phase A — Demo (now) | Phase B — Go-live (later) |
|---|---|---|
| App runtime | `npm run dev` on the dev machine | Node + PM2 on Sumopod VPS (Jakarta) |
| Database | Supabase Postgres (Singapore) | Postgres from apt, on the same VPS |
| Files | `./storage/uploads` | `/srv/rkl/uploads` |
| Auth | Auth.js, `DEMO_MODE=true` | Auth.js, `DEMO_MODE=false` |
| HTTPS / domain | none | Nginx + Certbot |
| Backups | none | daily `pg_dump` cron + `rsync` of uploads |

---

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Prisma · PostgreSQL ·
Auth.js (NextAuth v5) · Zod · Playwright

Everything lives in `frontend/`. There is no separate backend service — the API is
Next.js Route Handlers and Server Actions. See decision D1 in the planning document.

---

## Forbidden dependencies

These are not style preferences. Each one converts the half-day Go-Live Migration below
into a rewrite. Do not add them without first updating decision D9 in the planning doc.

```
@supabase/supabase-js       Supabase must stay a plain Postgres endpoint
Supabase Auth               auth is Auth.js
Supabase Storage            files go through src/server/storage/, on local disk
Supabase Edge Functions     business logic belongs in src/server/services/
```

Also enforced: **nothing under `src/server/services/` may import from `next/*`.**
That keeps the business logic framework-free if a standalone API is ever needed.

---

## Local setup

```bash
cd frontend
npm install
cp .env.example .env        # then fill in the values below
npx prisma migrate dev
npm run db:seed
npm run dev
```

### Supabase project settings (Phase A)

- Region: **Southeast Asia (Singapore)** — closest to Jakarta.
- Free tier **auto-pauses after 7 days of inactivity**. Open the Supabase dashboard and
  resume the project **the day before any client demo**, then run `npm run db:seed` to
  reset the data to a clean demo state.
- Free tier has **no backups**. Do not let real client data accumulate here.

### Environment variables

```ini
# Phase A: Supabase transaction pooler, port 6543
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Phase A: Supabase direct connection, port 5432 — used by Prisma Migrate only
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

AUTH_SECRET="<openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"

# Root directory for uploaded files. Never inside the code directory in production.
UPLOAD_ROOT="./storage/uploads"

# Enables the topbar role switcher. MUST be false in Phase B.
DEMO_MODE="true"
```

`.env` is gitignored and must never be committed.

---

## Go-Live Migration

Run this when the client says yes. Budget half a day.
Nothing here touches application code — it is configuration, data movement, and server
setup only. Tick the boxes as you go.

### 1. Provision the VPS

- [ ] Sumopod VPS, Jakarta, Ubuntu, **2 vCPU / 4 GB** (not the 2 GB tier — `next build`
      will run out of memory alongside Postgres)
- [ ] `apt install postgresql nginx certbot python3-certbot-nginx`
- [ ] Node via `nvm`, then `npm i -g pm2`
- [ ] Create directories:
      ```bash
      mkdir -p /srv/rkl/{app,uploads,backups}
      ```

### 2. Move the database

```bash
# from the dev machine, using the Supabase DIRECT_URL (port 5432, not the pooler)
pg_dump "$SUPABASE_DIRECT_URL" --no-owner --no-privileges -Fc -f rkl.dump

# on the VPS
sudo -u postgres createuser rkl --pwprompt
sudo -u postgres createdb rkl --owner=rkl
pg_restore -d "postgresql://rkl:<password>@localhost:5432/rkl" --no-owner rkl.dump
```

- [ ] Dump taken from Supabase
- [ ] Restored on the VPS and row counts verified against the source
- [ ] Postgres bound to **localhost only** — confirm `listen_addresses = 'localhost'`
      in `postgresql.conf` and that port 5432 is closed in the firewall

### 3. Move the uploaded files

```bash
rsync -av ./frontend/storage/uploads/ root@<vps>:/srv/rkl/uploads/
```

- [ ] Files copied
- [ ] `chown -R` to the user PM2 runs as
- [ ] Spot-check: open a document in the app and confirm it renders

### 4. Update environment

- [ ] `DATABASE_URL` and `DIRECT_URL` both point at `postgresql://rkl:...@localhost:5432/rkl`
- [ ] `UPLOAD_ROOT="/srv/rkl/uploads"`
- [ ] `AUTH_URL` set to the real https domain
- [ ] **`AUTH_SECRET` regenerated** — never reuse the demo secret
- [ ] **`DEMO_MODE="false"`** — this removes the topbar role switcher
- [ ] `.env` exists on the server only, `chmod 600`

### 5. Clean the demo data

- [ ] Delete or deactivate every user with `isDemo = true`
- [ ] Create real accounts with real passwords (never the demo credentials)
- [ ] Delete demo projects, or keep them only if the client explicitly asks
- [ ] Confirm no seeded row is presented anywhere as an actual company record

### 6. Serve it

- [ ] `pm2 start npm --name rkl -- start` and `pm2 save`
- [ ] `pm2 startup` so the app survives a reboot
- [ ] Nginx reverse proxy to the Node port
- [ ] `certbot --nginx` for HTTPS on the real domain
- [ ] Confirm the app is **not** reachable on the raw port from outside

### 7. Make it survivable

- [ ] Daily cron: `pg_dump` into `/srv/rkl/backups`, keep 14 days
- [ ] Daily cron: `rsync` of `/srv/rkl/uploads` to off-box storage
- [ ] **Restore-test the backup once** — an untested backup is not a backup
- [ ] Basic uptime check (Uptime Kuma, or anything that pages you)

### 8. Verify the migration is clean

- [ ] `grep -r "@supabase" frontend/` returns nothing
- [ ] `grep -rn "from ['\"]next/" frontend/src/server/services/` returns nothing
- [ ] Deploy command works end to end:
      ```bash
      git pull && npm ci && npx prisma migrate deploy && npm run build && pm2 reload rkl
      ```
- [ ] Full Playwright suite passes against the production URL
- [ ] Supabase project deleted, or downgraded and emptied

---

## Deploy (Phase B, routine)

```bash
cd /srv/rkl/app
git pull && npm ci && npx prisma migrate deploy && npm run build && pm2 reload rkl
```

A deploy must never touch `/srv/rkl/uploads`. If it ever does, the deploy script is wrong.
