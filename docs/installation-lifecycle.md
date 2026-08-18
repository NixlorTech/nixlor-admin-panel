# Installation Lifecycle

## Purpose

An **Installation** represents a physical on-prem deployment. A client may have multiple installations (e.g. Site A VMS, Site B PMS).

## Creation

`POST /api/installations`

```json
{
  "clientId": "...",
  "installationIdentifier": "chennai-hq-vms",
  "environment": "production",
  "hostname": "vms-server-01"
}
```

## Health States

Derived from `lastHeartbeatAt` and `status`:

| Health | Meaning |
|---|---|
| HEALTHY | Heartbeat within 24h |
| RECENTLY_SEEN | Heartbeat within 48h |
| OFFLINE | No recent heartbeat |
| MISMATCH | Hardware mismatch detected |
| DISABLED | Manually disabled |

## Hardware Binding

Licenses are bound to installations. Create an installation before issuing a license for a new on-prem deployment.

## Deployment Config

License generation returns:

```text
NIXLOR_CLIENT_ID
NIXLOR_MODULE_CODE
NIXLOR_MODULE_NAME
NIXLOR_HUB_URL
NIXLOR_INSTALLATION_ID
```

Persist `installationId` on the on-prem server (not in ephemeral container storage).
