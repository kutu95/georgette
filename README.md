# Georgette Research Manager

A local claim-centred research workbench for the SS Georgette project. Traces manuscript statements back to claims, evidence links, sources, and original files.

## Stack

- React + Vite + TypeScript + Tailwind (frontend)
- Node.js + Express (API)
- Prisma + PostgreSQL (`georgette` schema)

## Database connection

The app uses `DATABASE_URL` in `.env`. Your home server:

```
postgresql://postgres:postgres@192.168.0.146:54322/postgres
```

**P1001 / "Can't reach database server"** means your Mac cannot reach `192.168.0.146`. Common causes:

- Not on the same Wi‑Fi/LAN as the server
- VPN required but not connected
- The host machine is off or asleep
- Supabase/Postgres not running on that host

### Offline / local development

When the home server is unreachable, use the bundled local Postgres (Docker):

```bash
npm run db:local:up          # starts Postgres on localhost:54323
npm run db:local:migrate     # applies georgette schema locally
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54323/postgres npm run dev
```

Or temporarily set in `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54323/postgres"
```

When back on your home network, switch `.env` back to `192.168.0.146:54322`.

## Setup

1. Copy environment file and set your PostgreSQL connection:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

**Database safety — read this first**

This project **never** resets the database. If Prisma asks to reset, answer **No** / cancel.

| Safe | Unsafe (never use) |
|------|-------------------|
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:generate` | `prisma migrate reset` |
| | `prisma db push` |

`npm run db:migrate` runs `prisma migrate deploy` only — it applies pending migration files and **cannot** wipe data.

3. Create the `georgette` schema and tables (additive only):

```bash
npm run db:migrate
```

To add a future schema change: generate SQL with `prisma migrate diff`, review the file (no DROP/TRUNCATE), then run `npm run db:migrate` again.

4. Start the app (API on :3001, UI on :5173):

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Production deployment (research.margies.app)

The app runs on the home Ubuntu server (`192.168.0.146`) behind Cloudflare Tunnel, same pattern as `metal.margies.app`.

| Setting | Value |
|---------|-------|
| Server path | `/var/www/georgette-research` |
| App port | **3010** |
| Public URL | https://research.margies.app |
| Process manager | PM2 (`georgette-research`) |
| Database | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

### First-time deploy from your Mac

On the same network as the server:

```bash
./scripts/setup-and-deploy.sh
```

Enter your Ubuntu SSH password when prompted. This installs an SSH key, clones the repo, runs migrations, builds, and starts PM2.

### Subsequent deploys

```bash
./scripts/deploy-server.sh --remote
```

Or on the server directly:

```bash
cd /var/www/georgette-research
./scripts/deploy-server.sh
```

### Cloudflare Tunnel

DNS for `research.margies.app` is already in Cloudflare. Ensure the tunnel ingress includes:

```yaml
- hostname: research.margies.app
  service: http://127.0.0.1:3010
```

See `deploy/cloudflared-research.yml` for full notes. After editing `/etc/cloudflared/config.yml`:

```bash
sudo systemctl restart cloudflared
```

### Verify

```bash
curl -s http://127.0.0.1:3010/api/health   # on server
curl -s https://research.margies.app/api/health
pm2 logs georgette-research --lines 30 --nostream
```

## CSV Import

Use **Import** in the sidebar. Required columns:

```
source_id,current_file_name,suggested_standard_file_name,document_type,category,original_or_derived,importance,notes
```

- New `source_id` values are inserted
- Existing `source_id` values are updated (not duplicated)

## Historical Rules (enforced in API)

- **High confidence** on a claim requires at least one supporting evidence link from a primary (`original`) source
- **Contradictory evidence** and **contradiction records** cannot be deleted
- Confidence belongs to claims, not sources

## Database

Uses your existing PostgreSQL database with a separate `georgette` schema — no new database is created.

Tables: `sources`, `files`, `claims`, `people`, `places`, `events`, `contradictions`, `manuscript_references`, `tags`, `relationships`, `evidence_links`.
