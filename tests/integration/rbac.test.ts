import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PERMISSIONS } from "@/lib/permissions";
import { userHasPermission } from "@/lib/server/require-auth";
import {
  disconnectTestPrisma,
  ensureTestEnv,
  getTestDatabaseUrl,
  prepareTestData,
} from "./setup";
import { applySchema } from "./setup";

const hasTestDb = Boolean(getTestDatabaseUrl());

describe("RBAC permission matrix", { skip: !hasTestDb }, () => {
  before(async () => {
    ensureTestEnv();
    applySchema();
  });

  after(async () => {
    await disconnectTestPrisma();
  });

  it("SUPER_ADMIN has all sensitive permissions", async () => {
    const fixtures = await prepareTestData();
    const checks = [
      PERMISSIONS.LICENSES_GENERATE,
      PERMISSIONS.LICENSES_RENEW,
      PERMISSIONS.LICENSES_REVOKE,
      PERMISSIONS.LICENSES_REBIND_HARDWARE,
      PERMISSIONS.INSTALLATIONS_READ,
      PERMISSIONS.INSTALLATIONS_WRITE,
      PERMISSIONS.AUDIT_READ,
      PERMISSIONS.USERS_WRITE,
    ];
    for (const perm of checks) {
      assert.equal(userHasPermission(fixtures.superAdmin, perm), true, perm);
    }
  });

  it("MANAGER can manage licenses and installations but not users", async () => {
    const fixtures = await prepareTestData();
    assert.equal(userHasPermission(fixtures.manager, PERMISSIONS.LICENSES_GENERATE), true);
    assert.equal(userHasPermission(fixtures.manager, PERMISSIONS.LICENSES_RENEW), true);
    assert.equal(userHasPermission(fixtures.manager, PERMISSIONS.INSTALLATIONS_WRITE), true);
    assert.equal(userHasPermission(fixtures.manager, PERMISSIONS.USERS_WRITE), false);
    assert.equal(userHasPermission(fixtures.manager, PERMISSIONS.AUDIT_READ), false);
  });

  it("VIEWER cannot perform sensitive write operations", async () => {
    const fixtures = await prepareTestData();
    assert.equal(userHasPermission(fixtures.viewer, PERMISSIONS.CLIENTS_READ), true);
    assert.equal(userHasPermission(fixtures.viewer, PERMISSIONS.LICENSES_GENERATE), false);
    assert.equal(userHasPermission(fixtures.viewer, PERMISSIONS.LICENSES_REVOKE), false);
    assert.equal(userHasPermission(fixtures.viewer, PERMISSIONS.INSTALLATIONS_WRITE), false);
  });

  it("inactive admin is flagged inactive in database", async () => {
    const fixtures = await prepareTestData();
    assert.equal(fixtures.inactiveAdmin.isActive, false);
    assert.equal(userHasPermission(fixtures.inactiveAdmin, PERMISSIONS.LICENSES_GENERATE), true);
  });
});
