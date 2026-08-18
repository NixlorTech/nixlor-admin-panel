import test from "node:test";
import assert from "node:assert/strict";
import { HEARTBEAT_CACHE_CONTROL } from "../heartbeat-response";

test("heartbeat cache control is no-store", () => {
  assert.match(HEARTBEAT_CACHE_CONTROL, /no-store/);
  assert.match(HEARTBEAT_CACHE_CONTROL, /no-cache/);
  assert.match(HEARTBEAT_CACHE_CONTROL, /private/);
});
