import { SUPER_ADMIN_ROLE_SLUG } from "@/lib/permissions";
import type { VerifiedAdminUser } from "@/lib/server/require-auth";

export function userIsSuperAdmin(user: VerifiedAdminUser): boolean {
  return user.role.slug === SUPER_ADMIN_ROLE_SLUG;
}

type RoleBoundaryResult =
  | { ok: true }
  | { ok: false; message: string };

export function assertSuperAdminRoleBoundary(
  actor: VerifiedAdminUser,
  options: {
    targetRoleSlug?: string;
    currentRoleSlug?: string;
  },
): RoleBoundaryResult {
  const { targetRoleSlug, currentRoleSlug } = options;
  const touchesSuperAdmin =
    targetRoleSlug === SUPER_ADMIN_ROLE_SLUG ||
    currentRoleSlug === SUPER_ADMIN_ROLE_SLUG;

  if (touchesSuperAdmin && !userIsSuperAdmin(actor)) {
    return {
      ok: false,
      message:
        "Only a Super Admin may assign or change the Super Admin role",
    };
  }

  return { ok: true };
}
