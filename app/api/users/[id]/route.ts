import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";
import {
  deactivateAdminUser,
  updateAdminUser,
} from "@/lib/services/admin-user-mutations";

export const dynamic = "force-dynamic";

type UpdateUserBody = {
  email?: string;
  password?: string;
  name?: string;
  roleId?: string;
  isActive?: boolean;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await verifyAccess(PERMISSIONS.USERS_WRITE);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const { id } = await params;

  let body: UpdateUserBody;
  try {
    body = (await request.json()) as UpdateUserBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await updateAdminUser(access.user, id, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.user);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await verifyAccess(PERMISSIONS.USERS_DELETE);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const { id } = await params;
  const result = await deactivateAdminUser(access.user, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.user);
}
