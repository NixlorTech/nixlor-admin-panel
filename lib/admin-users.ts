import type { Prisma } from "@/lib/generated/prisma/client";
import type { AdminRoleRecord, AdminUserRecord } from "@/lib/domain-types";

export const adminUserInclude = {
  role: true,
} satisfies Prisma.AdminUserInclude;

export const adminRoleInclude = {
  permissions: {
    include: {
      permission: true,
    },
  },
} satisfies Prisma.AdminRoleInclude;

type AdminUserWithRole = Prisma.AdminUserGetPayload<{
  include: typeof adminUserInclude;
}>;

type AdminRoleWithPermissions = Prisma.AdminRoleGetPayload<{
  include: typeof adminRoleInclude;
}>;

export function serializeAdminUser(user: AdminUserWithRole): AdminUserRecord {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    role: {
      id: user.role.id,
      slug: user.role.slug,
      name: user.role.name,
    },
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function serializeAdminRole(role: AdminRoleWithPermissions): AdminRoleRecord {
  return {
    id: role.id,
    slug: role.slug,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: role.permissions.map((entry) => ({
      id: entry.permission.id,
      slug: entry.permission.slug,
      name: entry.permission.name,
      description: entry.permission.description,
      group: entry.permission.group,
    })),
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}
