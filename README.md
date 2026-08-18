# Nixlor Admin Hub

**Phase 1 frozen control plane** for Nixlor Technologies — CRM, licensing, installations, alliance partners, and heartbeat API for on-premises Nixlor software modules (VMS, PMS, Ticketing, and future products).

```text
Nixlor Admin Panel → Vercel → Neon PostgreSQL → On-Premise Nixlor Modules
```

Business data (clients, partners, modules, installations, licenses) is created through the Admin Panel UI. The database seed creates **only** RBAC roles, permissions, and one Super Admin user.

## Stack (Phase 1)

- **Next.js 16** (App Router) on **Vercel**
- **Neon PostgreSQL** with **Prisma 7** (`db push` + `db seed` — no migration tooling)
- **Auth.js v5** (credentials, server-only session)
- **RS256 JWT** license signing (`jsonwebtoken`, private key server-only)

## Environment variables

| Variable | Scope | Required | Description |
|----------|-------|----------|-------------|
| `DATABASE_URL` | Server only | Yes | PostgreSQL connection string (Neon) |
| `AUTH_SECRET` | Server only | Yes | Auth.js secret (`openssl rand -base64 32`) |
| `AUTH_URL` | Server only | Yes | Canonical app URL (also used as `NIXLOR_HUB_URL` in license deployment config) |
| `LICENSE_RSA_PRIVATE_KEY` | Server only | Yes | PEM private key for RS256 license signing |
| `LICENSE_RSA_KEY_ID` | Server only | No | JWT `kid` header (default: `nixlor-rsa-v1`) |
| `ADMIN_SEED_PASSWORD` | Server only | Production | Super Admin password for `db:seed`. **Required when `NODE_ENV=production`.** Dev may omit (documented fallback). |
| `HEARTBEAT_SEQUENCE_MODE` | Server only | No | `LEGACY_HEARTBEAT` \| `SEQUENCE_ENABLED` \| `SEQUENCE_REQUIRED` |
| `TEST_DATABASE_URL` | Development only | Tests | Isolated PostgreSQL for integration tests |

Never expose `DATABASE_URL`, `AUTH_SECRET`, `LICENSE_RSA_PRIVATE_KEY`, or `ADMIN_SEED_PASSWORD` to client-side code.

## Development setup

```bash
npm install
cp .env.example .env
# Set DATABASE_URL, AUTH_SECRET, AUTH_URL, LICENSE_RSA_PRIVATE_KEY

npm run db:generate
npm run db:push
npm run db:seed

npm run dev
```

Sign in at `http://localhost:3000/login`:

- **Email:** `admin@nixlor.com`
- **Password:** value of `ADMIN_SEED_PASSWORD` (dev fallback: `ChangeMeNow!123` if unset)

### Reset a disposable dev database

```bash
npx prisma db push --force-reset
npm run db:seed
```

Use `--force-reset` only on disposable development databases.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed roles, permissions, and Super Admin |
| `npm run db:verify` | Read-only database integrity check |
| `npm test` | Unit tests |
| `npm run test:integration` | Integration tests (Docker PostgreSQL on `:5433`) |

## Testing

```bash
npm test
npm run test:integration   # requires Docker or TEST_DATABASE_URL
npx prisma validate
npm run db:verify          # against DATABASE_URL
npm run build
```

## Deployment (Phase 1)

1. Create Vercel project and connect repository
2. Set server environment variables in Vercel (see table above)
3. Provision Neon PostgreSQL and set `DATABASE_URL`
4. Run once against production database:

```bash
npm run db:push
ADMIN_SEED_PASSWORD='<strong-password>' NODE_ENV=production npm run db:seed
```

5. Deploy via Vercel (`npm run build` runs automatically)

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/licenses/generate` | Admin session | Generate RS256 JWT license |
| `POST` | `/api/licenses/[id]/renew` | Admin session | Renew license |
| `PATCH` | `/api/licenses/[id]/status` | Admin session | Revoke / reactivate license |
| `PATCH` | `/api/licenses/[id]/hardware` | Admin session | Rebind hardware |
| `POST` | `/api/v1/heartbeat` | Public | On-prem heartbeat |
| `GET` | `/api/audit-logs` | Admin session | Audit log listing |

See `docs/` for licensing lifecycle, installation model, heartbeat protocol, and admin operations.

## Security — RSA key generation

```bash
openssl genrsa -out license_private.pem 2048
openssl rsa -in license_private.pem -pubout -out license_public.pem
```

Format for `.env` / Vercel (single line with `\n`):

```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' license_private.pem
```

Set as `LICENSE_RSA_PRIVATE_KEY`. The app restores PEM newlines in `lib/license.ts`.

## Dashboard routes

- `/dashboard` — Overview metrics
- `/dashboard/clients` — Client CRM
- `/dashboard/partners` — Alliance partners
- `/dashboard/modules` — Software modules
- `/dashboard/installations` — Installations
- `/dashboard/licenses/[id]` — License detail
- `/dashboard/audit-logs` — Audit trail
- `/dashboard/users` — Admin user management

## Phase 1 scope vs future

**Current (Phase 1):** Vercel-hosted admin panel, Neon PostgreSQL, CRM, licensing, installations, heartbeat API, on-prem product modules.

**Future (not implemented):** OTA updates, cloud multi-tenancy, cloud-hosted product modules, Redis, Kubernetes, advanced deployment automation, production migration/backup orchestration.

## Documentation

| Doc | Purpose |
|-----|---------|
| `docs/nixlor-phase1-architecture.md` | Architecture overview |
| `docs/licensing-lifecycle.md` | License states and transactions |
| `docs/installation-lifecycle.md` | Installation model |
| `docs/on-prem-deployment.md` | On-prem integration |
| `docs/heartbeat-sequence-migration.md` | Heartbeat sequence rollout |
| `docs/admin-operations.md` | Support workflows |
| `docs/rsa-key-rotation.md` | Key rotation procedure |
