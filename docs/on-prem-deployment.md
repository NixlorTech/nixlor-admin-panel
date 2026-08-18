# On-Prem Deployment

## Target Flow

```text
Create Client → Assign Partner → Create Installation → Generate License
     → Deploy on-prem → First heartbeat → ACTIVE
```

## Environment Variables (On-Prem)

```text
NIXLOR_CLIENT_ID=<from admin panel>
NIXLOR_MODULE_CODE=<e.g. VMS>
NIXLOR_LICENSE_KEY=<JWT from generation>
NIXLOR_HUB_URL=https://admin.nixlor.com
NIXLOR_INSTALLATION_ID=<from admin panel>
```

## Offline Grace

On-prem apps must operate for **14 days** without heartbeat using locally persisted license state.

## Heartbeat Interval

Server returns `nextPingJitter` (0–14400 seconds) to stagger global traffic.

## Security

- Never embed `LICENSE_RSA_PRIVATE_KEY` on customer servers
- Distribute only the public key for JWT verification
- Persist license state on a durable volume (not ephemeral container FS)
