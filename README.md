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

## Getting started

Cloning this repository is not enough to run it. `.env` is deliberately not
committed - it holds the database password and the session secret - and the
uploaded demo files are not committed either. Both are recreated below.

Budget about ten minutes, most of it waiting for Supabase to provision.

### Prerequisites

```text
Node.js 20 or newer      developed on 24.11
A Supabase account       the free tier is enough
```

That is the whole list. No Docker, no local PostgreSQL install, no global CLIs.

### 1. Create the database

1. Go to [supabase.com](https://supabase.com) and create a **New project**
2. Region: **Southeast Asia (Singapore)** - closest to Jakarta
3. Set a **Database Password** and save it somewhere. This is the only database
   password there is; it is not your supabase.com account password.
   Prefer letters and digits only - a password containing `@ : / ? # %` has to be
   URL-encoded inside the connection string, which trips people up.
4. Wait for provisioning, then click **Connect** in the top bar
5. Open the **ORMs** tab and choose **Prisma**

Supabase prints exactly the two variables the next step needs.

### 2. Configure the app

```bash
cd frontend
cp .env.example .env
```

Then fill in four values:

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Supabase → Connect → ORMs → Prisma. Port **6543**, keep `?pgbouncer=true` |
| `DIRECT_URL` | Same panel. Port **5432** |
| `AUTH_SECRET` | Generate one: `npx auth secret` |
| `DEMO_MODE` | `"true"` for a demo, `"false"` for real use |

**Why two database URLs.** Port 6543 is Supabase's transaction pooler - the right
endpoint for the short queries the running app makes. Port 5432 is a direct
session, which Prisma Migrate needs because migrations cannot run through a
pooler. The app reads the first, the CLI reads the second. At go-live both point
at the same local Postgres and nothing else changes.

The remaining variables in `.env.example` have working defaults; leave them.

### 3. Create the schema and demo data

```bash
npm install
npx prisma migrate deploy    # creates the 9 tables
npm run db:seed              # demo users, projects, documents
```

`db:seed` does two things worth knowing:

- It **deletes every row** before inserting, so it is safe to re-run whenever you
  want a clean demo state - and it **refuses to run unless `DEMO_MODE="true"`**,
  so it can never wipe a production database.
- It **writes real PDF and PNG files** to `frontend/storage/uploads/`. Those files
  are not in git, so without this step every document preview returns 410.

### 4. Run it

```bash
npm run dev
```

Open <http://localhost:3000>.

### Demo accounts

Password for every account: **`demo1234`**

| Email | Name | Role |
|---|---|---|
| `ceo@demo.local` | Hendra Kusuma | Direktur Utama |
| `accountant@demo.local` | Siti Rahma | Finance |
| `engineer@demo.local` | Budi Santoso | Engineer |
| `engineer2@demo.local` | Andi Wijaya | Engineer |
| `admin@demo.local` | Admin Sistem | Administrator |

With `DEMO_MODE="true"` you do not need to type any of this: the login page shows
one-click buttons that fill the fields, and a **Mode Demo** control in the top bar
switches role without logging out. Both disappear when `DEMO_MODE="false"`.

---

## Scripts

```text
npm run dev          development server
npm run build        production build
npm start            serve the production build
npm run lint         eslint over src and prisma
npm run typecheck    tsc --noEmit
npm run db:migrate   create and apply a new migration
npm run db:deploy    apply existing migrations (production)
npm run db:seed      reset to clean demo data
npm run db:studio    browse the database in Prisma Studio
```

---

## Troubleshooting

**Every route returns 404, and the console shows `ClientFetchError: Unexpected
token '<'`.** The `.next` directory holds artefacts from a production build while
the dev server expects development ones, so route resolution fails and
`/api/auth/session` returns an HTML 404 page that Auth.js tries to parse as JSON.
Stop the dev server first - Windows locks the directory while it runs - then:

```bash
rm -rf .next && npm run dev
```

**A change to `.env` seems to do nothing.** Next reads `.env` once at startup. It
is not part of hot reload. Restart the dev server.

**`Can't reach database server`.** The Supabase free tier pauses a project after
7 days of inactivity. Open the Supabase dashboard and resume it. Do this the day
before a client demo, not during one.

**`prisma migrate` fails but the app works.** `DIRECT_URL` is probably pointing at
port 6543. Migrations need the direct connection on 5432.

**Document preview returns 410.** The database row exists but the file does not -
usually a fresh clone, since `storage/uploads/` is not in git. Run
`npm run db:seed`.

**Login always fails with correct credentials.** Check that `AUTH_SECRET` is set
and that the seed has run. Without a seeded user there is nothing to log in as.

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
