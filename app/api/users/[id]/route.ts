import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  adminUserInclude,
  serializeAdminUser,
} from "@/lib/admin-users";
import { PERMISSIONS } from "@/lib/permissions";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";

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

  const existing = await prisma.adminUser.findUnique({
    where: { id },
    include: adminUserInclude,
  });

  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (id === access.user.id && body.isActive === false) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account" },
      { status: 400 },
    );
  }

  if (body.roleId) {
    const role = await prisma.adminRole.findUnique({
      where: { id: body.roleId },
    });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
  }

  const email = body.email?.trim().toLowerCase();
  if (email && email !== existing.email) {
    const duplicate = await prisma.adminUser.findUnique({ where: { email } });
    if (duplicate) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }
  }

  if (body.password && body.password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const user = await prisma.adminUser.update({
    where: { id },
    data: {
      email: email ?? undefined,
      name: body.name !== undefined ? body.name.trim() || null : undefined,
      roleId: body.roleId,
      isActive: body.isActive,
      passwordHash: body.password
        ? await bcrypt.hash(body.password, 12)
        : undefined,
    },
    include: adminUserInclude,
  });

  return NextResponse.json(serializeAdminUser(user));
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

  if (id === access.user.id) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account" },
      { status: 400 },
    );
  }

  const existing = await prisma.adminUser.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const user = await prisma.adminUser.update({
    where: { id },
    data: { isActive: false },
    include: adminUserInclude,
  });

  return NextResponse.json(serializeAdminUser(user));
}
