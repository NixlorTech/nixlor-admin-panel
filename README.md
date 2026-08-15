# Nixlor Admin Hub

Super Admin Panel for Nixlor Technologies — a cloud-based License Generation Hub and CRM for on-premises web applications (VMS, PMS, Ticketing, IMS, LMS, HMS, Billing).

## Stack

- **Next.js 16.3** (App Router)
- **TypeScript**
- **Tailwind CSS 4** + Shadcn-style UI components
- **Prisma 7.9** (PostgreSQL) — Prisma 8 is RC; this project uses the stable v7 line
- **Auth.js v5** (Credentials provider)
- **jsonwebtoken** (RS256 license signing)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Generate RSA keys (see Security section below) and set DATABASE_URL, AUTH_SECRET, LICENSE_RSA_PRIVATE_KEY

# 4. Push schema and seed admin user
npm run db:push
npm run db:seed

# 5. Start dev server
npm run dev
```

Sign in at `http://localhost:3000/login` with:

- **Email:** `admin@nixlor.com`
- **Password:** value of `ADMIN_SEED_PASSWORD` (default: `ChangeMeNow!123`)

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/licenses/generate` | Admin session | Generate RS256 JWT license |
| `POST` | `/api/v1/heartbeat` | Public | Daily license heartbeat from on-prem software |
| `GET` | `/api/clients` | Admin session | List all clients |
| `POST` | `/api/clients` | Admin session | Create a client |
| `PATCH` | `/api/licenses/[id]/status` | Admin session | Revoke or update license status |

### Heartbeat example

```bash
curl -X POST https://your-app.vercel.app/api/v1/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"clientId":"clxxx","module":"VMS"}'
```

## Security — RSA key generation

Generate a 2048-bit RSA private/public key pair:

```bash
# Private key (keep secret — server only)
openssl genrsa -out license_private.pem 2048

# Public key (distribute to on-premises apps for JWT verification)
openssl rsa -in license_private.pem -pubout -out license_public.pem
```

### Formatting the private key for Vercel `.env`

Vercel environment variables are single-line strings. Convert PEM newlines to `\n` literals:

**Option A — one-liner (recommended for Vercel dashboard):**

```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' license_private.pem
```

Paste the output as the value of `LICENSE_RSA_PRIVATE_KEY` in Vercel (no surrounding quotes needed in the dashboard UI).

**Option B — `.env` file locally:**

```env
LICENSE_RSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...(base64)...\n-----END PRIVATE KEY-----"
```

The app reads this via `process.env.LICENSE_RSA_PRIVATE_KEY` and restores real newlines with `.replace(/\\n/g, "\n")` in `lib/license.ts`.

Also set in Vercel:

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://your-production-domain.vercel.app
```

## Dashboard routes

- `/dashboard` — Overview metrics
- `/dashboard/clients` — Searchable client table with revoke actions
- Generate License modal — available on both pages

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Create/run migrations |
| `npm run db:seed` | Seed admin user |
