# Nixlor Phase 1 Architecture

## Control Plane

```text
Nixlor Admin Panel (Vercel)
        |
        +-- Neon PostgreSQL
        +-- RS256 License Signing (server-only private key)
        +-- Heartbeat API (/api/v1/heartbeat)
```

## Core Entities

| Entity | Purpose |
|---|---|
| Client | Customer CRM record |
| Installation | Physical on-prem deployment |
| SoftwareModule | Product catalog (stable `code`) |
| License | Entitlement bound to client + installation |
| LicenseTransaction | Immutable financial snapshot |
| LicenseEvent | Operational license history |
| HardwareBindingRecord | Hardware rebind audit trail |
| AuditLog | Immutable admin action log |
| IdempotencyRecord | Duplicate-request protection |

## Relationships

```text
Client
 ├── Installation(s)
 │      └── License(s) → SoftwareModule
 └── AlliancePartner (optional)
```

## Security Principles

- Private signing key never leaves the server
- Heartbeat responses use `Cache-Control: no-store`
- Hardware IDs stored as SHA-256 hashes on installations
- All sensitive admin actions write audit logs
- Financial transactions are append-only snapshots

## Deployment

1. `npm run db:generate`
2. `npm run db:push`
3. `npm run db:seed` (roles, permissions, Super Admin user)

## Out of scope (future phases)

Not part of Phase 1: OTA updates, cloud multi-tenancy, cloud-hosted product modules, Redis, Kubernetes, microservices, production migration tooling, automated backup orchestration.
