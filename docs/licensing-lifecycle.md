# Licensing Lifecycle

## States

```text
ISSUED → DELIVERED → ACTIVATED → ACTIVE → EXPIRED / REVOKED
```

`ActivationStatus` tracks issuance/activation. `LicenseStatus` tracks entitlement validity.

## Generation

`POST /api/licenses/generate`

- Creates or renews license in a transaction
- Records `LicenseTransaction` with immutable pricing/commission snapshots
- Signs RS256 JWT with `jti`, `clientId`, `module` code, optional `installationId`
- Writes `ISSUED` or `RENEWED` license event + audit log
- Supports `Idempotency-Key` header

## Renewal

`POST /api/licenses/:id/renew`

- Creates new transaction (does not mutate history)
- Extends license validity
- Issues new JWT with fresh `jti`

## Revocation

`PATCH /api/licenses/:id/status`

- Requires `revocationReason` enum for revocations
- Writes `REVOKED` event + audit log

## Hardware Rebind

`PATCH /api/licenses/:id/hardware`

- Requires `reason` in body
- Clears hardware binding for controlled reinstall
- Preserves previous binding in `hardware_binding_records`

## Heartbeat

`POST /api/v1/heartbeat`

Payload: `{ clientId, module, hardwareId, installationId?, softwareVersion?, schemaVersion? }`

- Validates client, module, installation alignment
- First successful ping: hardware bind + activation
- Mismatch returns `403 HARDWARE_MISMATCH`
- Returns `Cache-Control: no-store` and `nextPingJitter`
