# Nixlor Admin Panel — Production Release Checklist

Phase 1 frozen control plane for `https://admin.nixlor.com/`.

## Before deployment

### Repository

- [ ] Confirm target Git commit is the frozen Phase 1 release
- [ ] Run `npm test` (13/13 unit tests)
- [ ] Run `npm run test:integration` (33/33 integration tests)
- [ ] Run `npm run lint`
- [ ] Run `npx prisma validate`
- [ ] Run `npm run build`
- [ ] Run `npm audit` and review any findings
- [ ] Run `npm run db:verify` against production `DATABASE_URL` (read-only)

### Neon PostgreSQL (production)

- [ ] Confirm `DATABASE_URL` points to the **production** Neon project/branch
- [ ] Use Neon **pooled** connection string for serverless (recommended for Vercel)
- [ ] Run once manually (never in Vercel build/deploy hooks):

```bash
npm run db:push
NODE_ENV=production ADMIN_SEED_PASSWORD='<strong-password>' npm run db:seed
```

- [ ] Do **not** run `db push --force-reset` against production
- [ ] Confirm no `db:reset` script exists in `package.json`

### Vercel environment variables (Production)

Set these in the Vercel **Production** environment only:

| Variable | Scope | Required | Notes |
|----------|-------|----------|-------|
| `DATABASE_URL` | Server | Yes | Production Neon pooled URL |
| `AUTH_SECRET` | Server | Yes | `openssl rand -base64 32` |
| `AUTH_URL` | Server | Yes | `https://admin.nixlor.com` |
| `LICENSE_RSA_PRIVATE_KEY` | Server | Yes | PEM with `\n` escaped |
| `LICENSE_RSA_KEY_ID` | Server | No | Default `nixlor-rsa-v1` |
| `ADMIN_SEED_PASSWORD` | Server | Seed only | Required when `NODE_ENV=production` during seed |
| `HEARTBEAT_SEQUENCE_MODE` | Server | No | Default `LEGACY_HEARTBEAT` |

Do **not** set:

- `TEST_DATABASE_URL` in production
- Any `NEXT_PUBLIC_*` secret variables

Super Admin email is fixed in code: `admin@nixlor.com` (`lib/utils.ts`).

### Vercel project settings

- [ ] Production branch: `main` (or your release branch)
- [ ] Build command: `npm run build` (default)
- [ ] Install command: `npm install` (runs `prisma generate` via `postinstall`)
- [ ] Node.js version compatible with Next.js 16.3.1
- [ ] Custom domain `admin.nixlor.com` configured with HTTPS

### Security review

- [ ] `LICENSE_RSA_PRIVATE_KEY` exists only in Vercel server env (never in git)
- [ ] `AUTH_SECRET` is unique production value
- [ ] No development fallback password can be used in production seed (`ADMIN_SEED_PASSWORD` enforced)
- [ ] RSA public key distributed only to on-prem Nixlor modules (not in admin panel client bundle)

---

## After deployment

### Smoke tests (non-destructive first)

- [ ] `https://admin.nixlor.com/` loads
- [ ] Login with Super Admin credentials
- [ ] Logout works
- [ ] Dashboard metrics load

### CRM

- [ ] Create a test client (or use existing)
- [ ] Update client details
- [ ] Create alliance partner
- [ ] Create software module

### Installations & licensing

- [ ] Create installation for a client
- [ ] Generate license (installation + module)
- [ ] Open license detail page
- [ ] Renew license (with reason dialog)
- [ ] Revoke license (with reason dialog)
- [ ] Reactivate license (with reason dialog)
- [ ] Hardware rebind (with reason dialog)

### Security boundaries

- [ ] Super Admin can access `/dashboard/audit-logs`
- [ ] Manager cannot access audit logs API (`403`)
- [ ] Embedded audits hidden on license/installation detail without `audit.read`
- [ ] Only Super Admin can assign `SUPER_ADMIN` role

### Heartbeat (on-prem integration)

```bash
curl -X POST https://admin.nixlor.com/api/v1/heartbeat \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "<client-id>",
    "installationId": "<installation-id>",
    "module": "<MODULE_CODE>",
    "hardwareId": "<hardware-id>"
  }'
```

- [ ] Response includes `Cache-Control: no-store`
- [ ] Invalid client/installation returns safe denial (no data leakage)
- [ ] Rate limiting triggers under rapid requests

### User management (Super Admin only)

- [ ] Create admin user
- [ ] Change user role
- [ ] Deactivate user
- [ ] Verify audit log entries (`CREATE_USER`, `CHANGE_USER_ROLE`, `DEACTIVATE_USER`)

---

## Post-release

- [ ] Remove or deactivate any test data created during smoke tests (if undesired)
- [ ] Document RSA key ID and rotation date
- [ ] Freeze Admin Panel — future changes only for real customer needs or security issues

---

## Known non-blocking items

| Item | Status |
|------|--------|
| Next.js `middleware` → `proxy` deprecation warning | NON-BLOCKING — auth behavior unchanged; migrate only when codemod is verified safe |
| Auth rate limiting | NON-BLOCKING — heartbeat is rate-limited; credential brute-force relies on bcrypt + Vercel edge |

---

## Emergency rollback

1. Revert Vercel deployment to previous production build
2. Do **not** run `db push --force-reset` on production
3. Investigate logs in Vercel dashboard (no secrets should appear in logs)
