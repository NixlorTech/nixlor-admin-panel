# Heartbeat Sequence Migration Strategy

## Modes

| Mode | Env Value | Behavior |
|---|---|---|
| `LEGACY_HEARTBEAT` | default | `sequence` optional; backward compatible |
| `SEQUENCE_ENABLED` | `HEARTBEAT_SEQUENCE_MODE=SEQUENCE_ENABLED` | sequence validated when present |
| `SEQUENCE_REQUIRED` | `HEARTBEAT_SEQUENCE_MODE=SEQUENCE_REQUIRED` | sequence mandatory; rejects without it |

## Lifecycle

```text
Legacy Clients (no sequence)
        ↓
LEGACY_HEARTBEAT (default)
        ↓
Updated Licensing Agent ships sequence
        ↓
SEQUENCE_ENABLED
        ↓
All installations report sequence
        ↓
SEQUENCE_REQUIRED
        ↓
Legacy support retired
```

## Retirement Plan

1. **Phase 1 (current):** `LEGACY_HEARTBEAT` — no breaking changes
2. **Phase 1.5:** Monitor `installation.heartbeatSequence` adoption per client
3. **Phase 2:** Set `SEQUENCE_ENABLED` in staging; verify replay protection
4. **Phase 3:** Announce deadline; set `SEQUENCE_REQUIRED` in production
5. **Phase 4:** Remove legacy code path after all installations upgraded

## Configuration

```env
# Optional — defaults to LEGACY_HEARTBEAT
HEARTBEAT_SEQUENCE_MODE=LEGACY_HEARTBEAT
```

Admin panel distinguishes modes via heartbeat API error `SEQUENCE_REQUIRED` and `sequenceMode` in responses when enforcement is active.
