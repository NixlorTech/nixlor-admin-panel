import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  ActivationStatus,
  LicenseStatus,
} from "@/lib/generated/prisma/client";
import { HEARTBEAT_CACHE_CONTROL } from "@/lib/heartbeat-response";
import { POST as heartbeatPost } from "@/app/api/v1/heartbeat/route";
import { checkRateLimit, purgeExpiredRateLimits } from "@/lib/services/rate-limit";
import {
  applySchema,
  disconnectTestPrisma,
  ensureTestEnv,
  getTestDatabaseUrl,
  getTestPrisma,
  heartbeatRequest,
  prepareTestData,
} from "./setup";

const hasTestDb = Boolean(getTestDatabaseUrl());

describe("Heartbeat security", { skip: !hasTestDb }, () => {
  before(async () => {
    ensureTestEnv();
    applySchema();
  });

  after(async () => {
    await disconnectTestPrisma();
  });

  it("returns Cache-Control no-store on success", async () => {
    const fixtures = await prepareTestData();
    await getTestPrisma().license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        status: LicenseStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86_400_000 * 30),
      },
    });

    const response = await heartbeatPost(
      heartbeatRequest({
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        module: fixtures.module.code,
        hardwareId: "hw-001",
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), HEARTBEAT_CACHE_CONTROL);
  });

  it("rejects malformed JSON and invalid content type", async () => {
    const badType = await heartbeatPost(
      new Request("http://localhost/api/v1/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "x",
      }),
    );
    assert.equal(badType.status, 415);

    const badJson = await heartbeatPost(
      new Request("http://localhost/api/v1/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid",
      }),
    );
    assert.equal(badJson.status, 400);
  });

  it("rejects unknown installation without leaking data", async () => {
    const fixtures = await prepareTestData();
    const response = await heartbeatPost(
      heartbeatRequest({
        clientId: fixtures.client.id,
        installationId: "nonexistent-installation-id",
        module: fixtures.module.code,
        hardwareId: "hw-001",
      }),
    );
    assert.equal(response.status, 403);
    const body = (await response.json()) as { message: string };
    assert.equal(body.message, "Request denied");
  });

  it("rejects wrong module and wrong client", async () => {
    const fixtures = await prepareTestData();
    await getTestPrisma().license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        status: LicenseStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86_400_000 * 30),
      },
    });

    const wrongModule = await heartbeatPost(
      heartbeatRequest({
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        module: "NONEXISTENT",
        hardwareId: "hw-001",
      }),
    );
    assert.equal(wrongModule.status, 403);

    const wrongClient = await heartbeatPost(
      heartbeatRequest({
        clientId: fixtures.otherClient.id,
        installationId: fixtures.installation.id,
        module: fixtures.module.code,
        hardwareId: "hw-001",
      }),
    );
    assert.equal(wrongClient.status, 403);
  });

  it("handles sequence replay and regression", async () => {
    const fixtures = await prepareTestData();
    await getTestPrisma().license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        status: LicenseStatus.ACTIVE,
        activationStatus: ActivationStatus.ACTIVATED,
        hardwareId: "hw-seq",
        expiresAt: new Date(Date.now() + 86_400_000 * 30),
      },
    });

    await getTestPrisma().installation.update({
      where: { id: fixtures.installation.id },
      data: { heartbeatSequence: BigInt(10) },
    });

    const replay = await heartbeatPost(
      heartbeatRequest({
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        module: fixtures.module.code,
        hardwareId: "hw-seq",
        sequence: 10,
      }),
    );
    assert.equal(replay.status, 409);

    const regression = await heartbeatPost(
      heartbeatRequest({
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        module: fixtures.module.code,
        hardwareId: "hw-seq",
        sequence: 5,
      }),
    );
    assert.equal(regression.status, 409);
  });

  it("enforces rate limiting under rapid requests", async () => {
    const db = getTestPrisma();
    await prepareTestData();
    const key = "heartbeat:rate-test:inst";
    let blocked = false;
    for (let i = 0; i < 20; i++) {
      const result = await checkRateLimit(key);
      if (!result.allowed) {
        blocked = true;
        break;
      }
    }
    assert.equal(blocked, true);
    await purgeExpiredRateLimits();
    const buckets = await db.rateLimitBucket.count();
    assert.ok(buckets >= 0);
  });

  it("expired license returns REVOKED status on heartbeat", async () => {
    const fixtures = await prepareTestData();
    await getTestPrisma().license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        status: LicenseStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const response = await heartbeatPost(
      heartbeatRequest({
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        module: fixtures.module.code,
        hardwareId: "hw-expired",
      }),
    );
    assert.equal(response.status, 403);
    const body = (await response.json()) as { status: string };
    assert.equal(body.status, "REVOKED");
  });
});
