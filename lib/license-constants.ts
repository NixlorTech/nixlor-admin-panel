export const DEFAULT_COMMISSION_RATE = 20.0;

/**
 * Heartbeat sequence enforcement lifecycle:
 * LEGACY_HEARTBEAT — sequence optional (default, backward compatible)
 * SEQUENCE_ENABLED — sequence accepted and validated when present
 * SEQUENCE_REQUIRED — sequence mandatory (future enforcement)
 */
export type HeartbeatSequenceMode =
  | "LEGACY_HEARTBEAT"
  | "SEQUENCE_ENABLED"
  | "SEQUENCE_REQUIRED";

const VALID_SEQUENCE_MODES: HeartbeatSequenceMode[] = [
  "LEGACY_HEARTBEAT",
  "SEQUENCE_ENABLED",
  "SEQUENCE_REQUIRED",
];

export function getHeartbeatSequenceMode(): HeartbeatSequenceMode {
  const raw = process.env.HEARTBEAT_SEQUENCE_MODE ?? "LEGACY_HEARTBEAT";
  if (VALID_SEQUENCE_MODES.includes(raw as HeartbeatSequenceMode)) {
    return raw as HeartbeatSequenceMode;
  }
  return "LEGACY_HEARTBEAT";
}

/** Skip heartbeat DB writes if last ping was within this window. */
export const HEARTBEAT_WRITE_INTERVAL_MS = 60 * 60 * 1000;

/** Max random seconds before next heartbeat (4 hours). */
export const HEARTBEAT_JITTER_MAX_SECONDS = 14_400;

export function getNextPingJitter(): number {
  return Math.floor(Math.random() * (HEARTBEAT_JITTER_MAX_SECONDS + 1));
}
