import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import {
  ActivationStatus,
  LicenseStatus,
  TransactionType,
} from "@/lib/generated/prisma/client";
import { rebindHardware } from "@/lib/services/hardware-binding";
import { createInstallation } from "@/lib/services/installations";
import {
  applySchema,
  disconnectTestPrisma,
  ensureTestEnv,
  getTestDatabaseUrl,
  getTestPrisma,
  prepareTestData,
} from "./setup";

const hasTestDb = Boolean(getTestDatabaseUrl());

describe("Concurrency and invariants", { skip: !hasTestDb }, () => {
  before(async () => {
    ensureTestEnv();
    applySchema();
  });

  after(async () => {
    await disconnectTestPrisma();
  });

  it("allows same module on multiple installations for one client", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();

    const license1 = await db.license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module2.id,
        status: LicenseStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86_400_000 * 30),
      },
    });

    const license2 = await db.license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation2.id,
        softwareModuleId: fixtures.module2.id,
        status: LicenseStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86_400_000 * 30),
      },
    });

    assert.notEqual(license1.id, license2.id);
    assert.equal(license1.softwareModuleId, license2.softwareModuleId);
    assert.notEqual(license1.installationId, license2.installationId);
  });

  it("prevents duplicate installation identifier per client", async () => {
    const fixtures = await prepareTestData();
    await assert.rejects(
      () =>
        createInstallation({
          clientId: fixtures.client.id,
          installationIdentifier: "chennai-site",
        }),
      /Unique constraint/,
    );
  });

  it("prevents duplicate license per installation+module", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();

    await db.license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        status: LicenseStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86_400_000 * 30),
      },
    });

    await assert.rejects(
      () =>
        db.license.create({
          data: {
            clientId: fixtures.client.id,
            installationId: fixtures.installation.id,
            softwareModuleId: fixtures.module.id,
            status: LicenseStatus.ACTIVE,
            expiresAt: new Date(Date.now() + 86_400_000 * 30),
          },
        }),
      /Unique constraint/,
    );
  });

  it("concurrent renewals with same idempotency key create one transaction", async () => {
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

    const key = `renew-${randomUUID()}`;
    const validFrom = new Date();
    const validUntil = new Date(validFrom);
    validUntil.setDate(validUntil.getDate() + 30);

    const createRenewal = () =>
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
      });

    const results = await Promise.allSettled([
      createRenewal(),
      createRenewal(),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);

    const count = await db.licenseTransaction.count({
      where: { licenseId: license.id },
    });
    assert.equal(count, 1);
  });

  it("concurrent rebinds preserve hardware history", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();
    const license = await db.license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        status: LicenseStatus.ACTIVE,
        hardwareId: "hw-original",
        expiresAt: new Date(Date.now() + 86_400_000 * 30),
      },
    });

    await rebindHardware({
      licenseId: license.id,
      reason: "Server replacement",
      actorId: fixtures.superAdmin.id,
    });

    const records = await db.hardwareBindingRecord.findMany({
      where: { licenseId: license.id },
    });
    assert.equal(records.length, 1);
    assert.ok(records[0].previousHardwareHash);
    assert.equal(records[0].reason, "Server replacement");
  });

  it("detects client/installation mismatch via integrity query", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();

    await db.license.create({
      data: {
        clientId: fixtures.otherClient.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        status: LicenseStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86_400_000 * 30),
      },
    });

    const mismatches = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM licenses l
      JOIN installations i ON i.id = l."installationId"
      WHERE l."clientId" <> i."clientId"
    `;
    assert.equal(Number(mismatches[0]?.count ?? 0), 1);
  });

  it("renewal transaction is atomic with license update", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();
    const license = await db.license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        status: LicenseStatus.ACTIVE,
        activationStatus: ActivationStatus.ACTIVATED,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    const newExpiry = new Date(Date.now() + 86_400_000 * 400);
    await db.$transaction(async (tx) => {
      await tx.license.update({
        where: { id: license.id },
        data: { expiresAt: newExpiry, status: LicenseStatus.ACTIVE },
      });
      await tx.licenseTransaction.create({
        data: {
          licenseId: license.id,
          transactionType: TransactionType.RENEWAL,
          amountPaid: 8000,
          basePriceAtTime: fixtures.module.basePrice,
          validFrom: new Date(),
          validUntil: newExpiry,
        },
      });
    });

    const updated = await db.license.findUniqueOrThrow({ where: { id: license.id } });
    const txCount = await db.licenseTransaction.count({ where: { licenseId: license.id } });
    assert.equal(updated.expiresAt.getTime(), newExpiry.getTime());
    assert.equal(txCount, 1);
  });
});
