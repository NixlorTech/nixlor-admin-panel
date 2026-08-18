import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PERMISSIONS } from "@/lib/permissions";
import {
  canReadAuditLogs,
  resolveEntityAuditsForUser,
} from "@/lib/server/audit-access";
import { userHasPermission } from "@/lib/server/require-auth";
import {
  createAdminUser,
  updateAdminUser,
} from "@/lib/services/admin-user-mutations";
import {
  applySchema,
  disconnectTestPrisma,
  ensureTestEnv,
  getTestDatabaseUrl,
  getTestPrisma,
  prepareTestData,
} from "./setup";

const hasTestDb = Boolean(getTestDatabaseUrl());

async function createUsersWriteActor(
  db: ReturnType<typeof getTestPrisma>,
  fixtures: Awaited<ReturnType<typeof prepareTestData>>,
) {
  const usersWritePermission = await db.permission.findUniqueOrThrow({
    where: { slug: "users.write" },
  });

  const userAdminRole = await db.adminRole.create({
    data: {
      slug: "USER_ADMIN_TEST",
      name: "User Admin Test",
      isSystem: false,
    },
  });

  await db.rolePermission.create({
    data: {
      roleId: userAdminRole.id,
      permissionId: usersWritePermission.id,
    },
  });

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash("test-password", 4);

  const userAdmin = await db.adminUser.create({
    data: {
      email: "useradmin@nixlor.test",
      passwordHash,
      roleId: userAdminRole.id,
    },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });

  return { userAdmin, superAdminRole: fixtures.superAdmin.role };
}

describe("Security boundaries", { skip: !hasTestDb }, () => {
  before(async () => {
    ensureTestEnv();
    applySchema();
  });

  after(async () => {
    await disconnectTestPrisma();
  });

  it("audit.read controls embedded license audits", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();

    const license = await db.license.create({
      data: {
        clientId: fixtures.client.id,
        installationId: fixtures.installation.id,
        softwareModuleId: fixtures.module.id,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    await db.auditLog.create({
      data: {
        action: "GENERATE_LICENSE",
        entityType: "License",
        entityId: license.id,
        actorId: fixtures.superAdmin.id,
      },
    });

    assert.equal(canReadAuditLogs(fixtures.manager), false);
    assert.equal(canReadAuditLogs(fixtures.superAdmin), true);

    const managerAudits = await resolveEntityAuditsForUser(
      fixtures.manager,
      "License",
      license.id,
    );
    assert.deepEqual(managerAudits, []);

    const superAudits = await resolveEntityAuditsForUser(
      fixtures.superAdmin,
      "License",
      license.id,
    );
    assert.equal(superAudits.length, 1);
    assert.equal(superAudits[0].action, "GENERATE_LICENSE");
  });

  it("audit.read controls embedded installation audits", async () => {
    const fixtures = await prepareTestData();
    const db = getTestPrisma();

    await db.auditLog.create({
      data: {
        action: "CREATE_INSTALLATION",
        entityType: "Installation",
        entityId: fixtures.installation.id,
        actorId: fixtures.superAdmin.id,
      },
    });

    const managerAudits = await resolveEntityAuditsForUser(
      fixtures.manager,
      "Installation",
      fixtures.installation.id,
    );
    assert.deepEqual(managerAudits, []);

    const superAudits = await resolveEntityAuditsForUser(
      fixtures.superAdmin,
      "Installation",
      fixtures.installation.id,
    );
    assert.equal(superAudits.length, 1);
  });

  it("audit.read is required for audit log access", async () => {
    const fixtures = await prepareTestData();

    assert.equal(userHasPermission(fixtures.manager, PERMISSIONS.AUDIT_READ), false);
    assert.equal(userHasPermission(fixtures.superAdmin, PERMISSIONS.AUDIT_READ), true);
  });

  it("only Super Admin may assign SUPER_ADMIN role", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();
    const { userAdmin, superAdminRole } = await createUsersWriteActor(db, fixtures);

    const denied = await createAdminUser(userAdmin, {
      email: "new-super@nixlor.test",
      password: "password123",
      roleId: superAdminRole.id,
    });
    assert.equal(denied.ok, false);
    if (!denied.ok) {
      assert.equal(denied.status, 403);
    }

    const allowed = await createAdminUser(fixtures.superAdmin, {
      email: "new-super@nixlor.test",
      password: "password123",
      roleId: superAdminRole.id,
    });
    assert.equal(allowed.ok, true);
  });

  it("records user-management audit entries without secrets", async () => {
    const db = getTestPrisma();
    const fixtures = await prepareTestData();
    const viewerRole = await db.adminRole.findUniqueOrThrow({
      where: { slug: "VIEWER" },
    });

    const created = await createAdminUser(fixtures.superAdmin, {
      email: "audited-user@nixlor.test",
      password: "password123",
      roleId: viewerRole.id,
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const createAudit = await db.auditLog.findFirst({
      where: {
        entityType: "AdminUser",
        entityId: created.user.id,
        action: "CREATE_USER",
      },
    });
    assert.ok(createAudit);
    assert.equal(JSON.stringify(createAudit).includes("password"), false);
    assert.equal(JSON.stringify(createAudit).includes("passwordHash"), false);

    const managerRole = await db.adminRole.findUniqueOrThrow({
      where: { slug: "MANAGER" },
    });
    const roleChange = await updateAdminUser(fixtures.superAdmin, created.user.id, {
      roleId: managerRole.id,
    });
    assert.equal(roleChange.ok, true);

    const roleAudit = await db.auditLog.findFirst({
      where: {
        entityId: created.user.id,
        action: "CHANGE_USER_ROLE",
      },
    });
    assert.ok(roleAudit);

    const deactivate = await updateAdminUser(fixtures.superAdmin, created.user.id, {
      isActive: false,
    });
    assert.equal(deactivate.ok, true);

    const deactivateAudit = await db.auditLog.findFirst({
      where: {
        entityId: created.user.id,
        action: "DEACTIVATE_USER",
      },
    });
    assert.ok(deactivateAudit);

    const reactivate = await updateAdminUser(fixtures.superAdmin, created.user.id, {
      isActive: true,
    });
    assert.equal(reactivate.ok, true);

    const reactivateAudit = await db.auditLog.findFirst({
      where: {
        entityId: created.user.id,
        action: "REACTIVATE_USER",
      },
    });
    assert.ok(reactivateAudit);
  });
});
