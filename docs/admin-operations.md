# Admin Operations

## Permissions

| Permission | Action |
|---|---|
| `licenses.generate` | Issue licenses |
| `licenses.renew` | Renew licenses |
| `licenses.revoke` | Revoke / reactivate |
| `licenses.rebind_hardware` | Reset hardware binding |
| `installations.read` | View installations |
| `installations.write` | Create installations |
| `audit.read` | View audit logs |

## Support Workflow

1. Open **Clients** → select customer
2. Review **Active Licenses** (hardware lock, expiry)
3. Check installation health via `GET /api/installations?clientId=...`
4. View license events: `GET /api/licenses/:id` (includes `events` array)
5. View audit trail: `GET /api/audit-logs?entityType=License&entityId=...`

## Hardware Replacement

1. Confirm customer identity
2. Click **Reset Hardware** (requires reason)
3. Customer reinstalls and sends first heartbeat
4. New hardware binding recorded automatically

## Idempotency

For license generation and renewal, send:

```http
Idempotency-Key: <uuid>
```

Duplicate requests within 24h return the original response.
