import { NextResponse } from "next/server";
import type { PermissionSlug } from "@/lib/permissions";
import {
  isAccessDenied,
  verifyAccess,
} from "@/lib/server/require-auth";

export { isAccessDenied, verifyAccess };
export type {
  VerifiedAdminUser,
  VerifyAccessResult,
} from "@/lib/server/require-auth";

export async function requireAuth() {
  const result = await verifyAccess();
  if (isAccessDenied(result)) {
    return { error: result.error };
  }
  return { session: { user: result.user } };
}

export async function requirePermission(permission: PermissionSlug | string) {
  const result = await verifyAccess(permission);
  if (isAccessDenied(result)) {
    return { error: result.error };
  }
  return { session: { user: result.user } };
}

export async function requireAnyPermission(
  permissions: Array<PermissionSlug | string>,
) {
  let lastError: NextResponse | undefined;

  for (const permission of permissions) {
    const result = await verifyAccess(permission);
    if (!isAccessDenied(result)) {
      return { session: { user: result.user } };
    }
    lastError = result.error;
  }

  return {
    error:
      lastError ??
      NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }),
  };
}
