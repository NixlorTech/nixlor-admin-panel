import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import {
  ActivationStatus,
  LicenseStatus,
  TransactionType,
} from "@/lib/generated/prisma/client";
import { hashHardwareId } from "@/lib/server/security";
import { POST as heartbeatPost } from "@/app/api/v1/heartbeat/route";
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

describe("Phase 1 licensing integration", { skip: !hasTestDb }, () => {
  before(async () => {
    ensureTestEnv();
    applySchema();
  });

  after(async () => {
    await disconnectTestPrisma();
  });

  it("generates license with transaction and enforces installation client match", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();

    const validFrom = new Date();
    const expiresAt = new Date(validFrom);
    expiresAt.setDate(expiresAt.getDate() + 365);
    const tokenId = randomUUID();

    const license = await db.$transaction(async (tx) => {
      const created = await tx.license.create({
        data: {
          clientId: fixtures.client.id,
          installationId: fixtures.installation.id,
          softwareModuleId: fixtures.module.id,
          status: LicenseStatus.ACTIVE,
          activationStatus: ActivationStatus.ISSUED,
          validFrom,
          expiresAt,
          latestTokenId: tokenId,
        },
      });

      await tx.licenseTransaction.create({
        data: {
          licenseId: created.id,
          transactionType: TransactionType.NEW_ISSUANCE,
          amountPaid: 10000,
          basePriceAtTime: fixtures.module.basePrice,
          commissionRate: 20,
          commissionAmount: 2000,
          validFrom,
          validUntil: expiresAt,
          alliancePartnerId: fixtures.partner.id,
        },
      });

      return created;
    });

    const mismatch = await db.license.findFirst({
      where: {
        id: license.id,
        installation: { clientId: fixtures.otherClient.id },
      },
    });
    assert.equal(mismatch, null);

    const txCount = await db.licenseTransaction.count({
      where: { licenseId: license.id },
    });
    assert.equal(txCount, 1);
  });

  it("rejects duplicate idempotency key for renewal transactions", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();

    const license = await db.license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        status: LicenseStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    const key = `renew-${randomUUID()}`;
    const validFrom = new Date();
    const validUntil = new Date(validFrom);
    validUntil.setDate(validUntil.getDate() + 30);

    await db.licenseTransaction.create({
      data: {
        licenseId: license.id,
        transactionType: TransactionType.RENEWAL,
        amountPaid: 5000,
        basePriceAtTime: 10000,
        validFrom,
        validUntil,
        idempotencyKey: key,
      },
    });

    await assert.rejects(
      () =>
        db.licenseTransaction.create({
          data: {
            licenseId: license.id,
            transactionType: TransactionType.RENEWAL,
            amountPaid: 5000,
            basePriceAtTime: 10000,
            validFrom,
            validUntil,
            idempotencyKey: key,
          },
        }),
      /Unique constraint/,
    );

    const count = await db.licenseTransaction.count({
      where: { licenseId: license.id },
    });
    assert.equal(count, 1);
  });

  it("activates on first heartbeat and rejects revoked license", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();
    const hardwareId = "hw-test-001";

    const license = await db.license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        status: LicenseStatus.ACTIVE,
        activationStatus: ActivationStatus.ISSUED,
        expiresAt: new Date(Date.now() + 86_400_000 * 30),
      },
    });

    const activeResponse = await heartbeatPost(
      heartbeatRequest({
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        module: fixtures.module.code,
        hardwareId,
      }),
    );

    assert.equal(activeResponse.status, 200);
    const activeBody = (await activeResponse.json()) as { status: string };
    assert.equal(activeBody.status, "ACTIVE");

    const activated = await db.license.findUniqueOrThrow({
      where: { id: license.id },
    });
    assert.equal(activated.activationStatus, ActivationStatus.ACTIVATED);
    assert.ok(activated.hardwareId);

    await db.license.update({
      where: { id: license.id },
      data: { status: LicenseStatus.REVOKED },
    });

    const revokedResponse = await heartbeatPost(
      new Request("http://localhost/api/v1/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: fixtures.client.id,
          installationId: fixtures.installation.id,
          module: fixtures.module.code,
          hardwareId,
        }),
      }),
    );

    assert.equal(revokedResponse.status, 403);
    const revokedBody = (await revokedResponse.json()) as { status?: string };
    assert.equal(revokedBody.status, "REVOKED");
  });

  it("detects hardware mismatch and stale heartbeat sequence", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();
    const hardwareId = "hw-bound-001";

    await db.license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        status: LicenseStatus.ACTIVE,
        activationStatus: ActivationStatus.ACTIVATED,
        hardwareId,
        expiresAt: new Date(Date.now() + 86_400_000 * 30),
      },
    });

    await db.installation.update({
      where: { id: fixtures.installation.id },
      data: { heartbeatSequence: BigInt(5) },
    });

    const mismatchResponse = await heartbeatPost(
      new Request("http://localhost/api/v1/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: fixtures.client.id,
          installationId: fixtures.installation.id,
          module: fixtures.module.code,
          hardwareId: "different-hardware",
        }),
      }),
    );
    assert.equal(mismatchResponse.status, 403);
    const mismatchBody = (await mismatchResponse.json()) as { error: string };
    assert.equal(mismatchBody.error, "HARDWARE_MISMATCH");

    const staleResponse = await heartbeatPost(
      new Request("http://localhost/api/v1/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: fixtures.client.id,
          installationId: fixtures.installation.id,
          module: fixtures.module.code,
          hardwareId,
          sequence: 3,
        }),
      }),
    );
    assert.equal(staleResponse.status, 409);
    const staleBody = (await staleResponse.json()) as { error: string };
    assert.equal(staleBody.error, "STALE_REQUEST");
  });

  it("preserves historical transaction amounts (append-only ledger)", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();

    const license = await db.license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        status: LicenseStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86_400_000 * 30),
      },
    });

    const tx = await db.licenseTransaction.create({
      data: {
        licenseId: license.id,
        transactionType: TransactionType.NEW_ISSUANCE,
        amountPaid: 12000,
        basePriceAtTime: 10000,
        commissionRate: 20,
        commissionAmount: 2400,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86_400_000 * 365),
      },
    });

    const original = await db.licenseTransaction.findUniqueOrThrow({
      where: { id: tx.id },
    });

    await db.licenseTransaction.create({
      data: {
        licenseId: license.id,
        transactionType: TransactionType.RENEWAL,
        amountPaid: 8000,
        basePriceAtTime: 10000,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86_400_000 * 365),
      },
    });

    const historical = await db.licenseTransaction.findUniqueOrThrow({
      where: { id: tx.id },
    });

    assert.equal(historical.amountPaid, original.amountPaid);
    assert.equal(historical.commissionAmount, original.commissionAmount);
    assert.equal(historical.basePriceAtTime, original.basePriceAtTime);
  });

  it("retains hardware binding history on rebind", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();

    const license = await db.license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        status: LicenseStatus.ACTIVE,
        hardwareId: "old-hw",
        rebindCount: 1,
        expiresAt: new Date(Date.now() + 86_400_000 * 30),
      },
    });

    const previousHash = hashHardwareId("old-hw");
    const newHash = hashHardwareId("new-hw");

    await db.hardwareBindingRecord.create({
      data: {
        licenseId: license.id,
        installationId: fixtures.installation.id,
        previousHardwareHash: previousHash,
        newHardwareHash: newHash,
        reason: "Server replacement",
      },
    });

    await db.license.update({
      where: { id: license.id },
      data: { hardwareId: "new-hw", rebindCount: { increment: 1 } },
    });

    const records = await db.hardwareBindingRecord.findMany({
      where: { licenseId: license.id },
      orderBy: { createdAt: "asc" },
    });

    assert.equal(records.length, 1);
    assert.equal(records[0].previousHardwareHash, previousHash);
    assert.equal(records[0].newHardwareHash, newHash);
  });
});
