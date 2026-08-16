import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";
import { auth } from "@/auth";
import { FORBIDDEN_ERROR, USER_DEACTIVATED_ERROR } from "@/lib/auth-errors";
import { prisma } from "@/lib/prisma";
import {
  resolvePermissionSlug,
  SUPER_ADMIN_ROLE_SLUG,
} from "@/lib/permissions";

export const verifiedAdminUserInclude = {
  role: {
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  },
} satisfies Prisma.AdminUserInclude;

export type VerifiedAdminUser = Prisma.AdminUserGetPayload<{
  include: typeof verifiedAdminUserInclude;
}>;

export type VerifyAccessSuccess = {
  user: VerifiedAdminUser;
};

export type VerifyAccessFailure = {
  error: NextResponse;
};

export type VerifyAccessResult = VerifyAccessSuccess | VerifyAccessFailure;

export function isAccessDenied(
  result: VerifyAccessResult,
): result is VerifyAccessFailure {
  return "error" in result;
}

function userHasPermission(
  user: VerifiedAdminUser,
  requiredPermissionSlug: string,
): boolean {
  if (
    user.role.slug === SUPER_ADMIN_ROLE_SLUG ||
    user.role.name === "Super Admin"
  ) {
    return true;
  }

  const resolvedSlug = resolvePermissionSlug(requiredPermissionSlug);
  const permissionSlugs = user.role.permissions.map(
    (entry) => entry.permission.slug,
  );

  return permissionSlugs.includes(resolvedSlug);
}

export async function verifyAccess(
  requiredPermissionSlug?: string,
): Promise<VerifyAccessResult> {
  const session = await auth();

  if (!session?.user?.email) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await prisma.adminUser.findUnique({
    where: { email: session.user.email },
    include: verifiedAdminUserInclude,
  });

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!user.isActive) {
    return {
      error: NextResponse.json(
        { error: USER_DEACTIVATED_ERROR },
        { status: 401 },
      ),
    };
  }

  if (
    requiredPermissionSlug &&
    !userHasPermission(user, requiredPermissionSlug)
  ) {
    return {
      error: NextResponse.json({ error: FORBIDDEN_ERROR }, { status: 403 }),
    };
  }

  return { user };
}
