import test from "node:test";
import assert from "node:assert/strict";
import { heartbeatSchema } from "../validations";

test("heartbeat schema requires installationId", () => {
  const result = heartbeatSchema.safeParse({
    clientId: "clxxxxxxxxxxxxxxxx",
    module: "VMS",
    hardwareId: "hw-abc-123",
  });
  assert.equal(result.success, false);
});

test("heartbeat schema accepts valid payload", () => {
  const result = heartbeatSchema.safeParse({
    clientId: "clxxxxxxxxxxxxxxxx",
    module: "VMS",
    hardwareId: "hw-abc-123",
    installationId: "inxxxxxxxxxxxxxxxx",
    sequence: 1,
  });
  assert.equal(result.success, true);
});
