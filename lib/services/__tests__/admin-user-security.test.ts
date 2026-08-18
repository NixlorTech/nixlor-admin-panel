import test from "node:test";
import assert from "node:assert/strict";
import { assertSuperAdminRoleBoundary } from "@/lib/services/admin-user-security";
import type { VerifiedAdminUser } from "@/lib/server/require-auth";

function makeUser(roleSlug: string): VerifiedAdminUser {
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
      permissions: [],
    },
  };
}

test("Super Admin may assign SUPER_ADMIN role", () => {
  const actor = makeUser("SUPER_ADMIN");
  const result = assertSuperAdminRoleBoundary(actor, {
    targetRoleSlug: "SUPER_ADMIN",
  });
  assert.equal(result.ok, true);
});

test("Manager cannot assign SUPER_ADMIN role", () => {
  const actor = makeUser("MANAGER");
  const result = assertSuperAdminRoleBoundary(actor, {
    targetRoleSlug: "SUPER_ADMIN",
  });
  assert.equal(result.ok, false);
});

test("Viewer cannot assign SUPER_ADMIN role", () => {
  const actor = makeUser("VIEWER");
  const result = assertSuperAdminRoleBoundary(actor, {
    targetRoleSlug: "SUPER_ADMIN",
  });
  assert.equal(result.ok, false);
});

test("Manager cannot demote SUPER_ADMIN", () => {
  const actor = makeUser("MANAGER");
  const result = assertSuperAdminRoleBoundary(actor, {
    targetRoleSlug: "MANAGER",
    currentRoleSlug: "SUPER_ADMIN",
  });
  assert.equal(result.ok, false);
});

test("Manager may assign MANAGER role to another manager", () => {
  const actor = makeUser("MANAGER");
  const result = assertSuperAdminRoleBoundary(actor, {
    targetRoleSlug: "MANAGER",
    currentRoleSlug: "VIEWER",
  });
  assert.equal(result.ok, true);
});
