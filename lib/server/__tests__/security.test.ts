import test from "node:test";
import assert from "node:assert/strict";
import { hashHardwareId } from "../security";

test("hashHardwareId normalizes and hashes consistently", () => {
  const hash1 = hashHardwareId("  abc-123  ");
  const hash2 = hashHardwareId("abc-123");
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
});

test("hashHardwareId produces different hashes for different inputs", () => {
  const hash1 = hashHardwareId("machine-a");
  const hash2 = hashHardwareId("machine-b");
  assert.notEqual(hash1, hash2);
});
