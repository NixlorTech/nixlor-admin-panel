export const DEFAULT_COMMISSION_RATE = 20.0;

/** Skip heartbeat DB writes if last ping was within this window. */
export const HEARTBEAT_WRITE_INTERVAL_MS = 60 * 60 * 1000;

/** Max random seconds before next heartbeat (4 hours). */
export const HEARTBEAT_JITTER_MAX_SECONDS = 14_400;

export function getNextPingJitter(): number {
  return Math.floor(Math.random() * (HEARTBEAT_JITTER_MAX_SECONDS + 1));
}
