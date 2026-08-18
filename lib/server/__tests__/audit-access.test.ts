import test from "node:test";
import assert from "node:assert/strict";
import { PERMISSIONS } from "@/lib/permissions";
import { canReadAuditLogs } from "@/lib/server/audit-access";
import type { VerifiedAdminUser } from "@/lib/server/require-auth";

function makeUser(roleSlug: string, permissions: string[]): VerifiedAdminUser {
  return {
    id: "user-1",
    email: "test@nixlor.test",
    passwordHash: "hash",
    name: "Test",
    isActive: true,
    roleId: "role-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: "role-1",
      slug: roleSlug,
      name: roleSlug,
      description: null,
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: permissions.map((slug, index) => ({
        roleId: "role-1",
        permissionId: `perm-${index}`,
        permission: {
          id: `perm-${index}`,
          slug,
          name: slug,
          description: null,
          group: "Test",
        },
      })),
    },
  };
}

test("canReadAuditLogs returns true when user has audit.read", () => {
  const user = makeUser("MANAGER", [PERMISSIONS.AUDIT_READ, PERMISSIONS.CLIENTS_READ]);
  assert.equal(canReadAuditLogs(user), true);
});

test("canReadAuditLogs returns false without audit.read", () => {
  const user = makeUser("MANAGER", [PERMISSIONS.CLIENTS_READ, PERMISSIONS.INSTALLATIONS_READ]);
  assert.equal(canReadAuditLogs(user), false);
});

test("canReadAuditLogs returns true for Super Admin", () => {
  const user = makeUser("SUPER_ADMIN", []);
  assert.equal(canReadAuditLogs(user), true);
});
