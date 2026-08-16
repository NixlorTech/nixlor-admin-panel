import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  adminUserInclude,
  serializeAdminUser,
} from "@/lib/admin-users";
import {
  buildPaginatedResponse,
  parsePaginationSearchParams,
} from "@/lib/pagination";
import { PERMISSIONS } from "@/lib/permissions";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await verifyAccess(PERMISSIONS.USERS_READ);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const { page, pageSize, search } = parsePaginationSearchParams(
    new URL(request.url).searchParams,
  );

  const where: Prisma.AdminUserWhereInput | undefined = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          {
            role: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        ],
      }
    : undefined;

  const [users, total] = await Promise.all([
    prisma.adminUser.findMany({
      where,
      include: adminUserInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.adminUser.count({ where }),
  ]);

  return NextResponse.json(
    buildPaginatedResponse(
      users.map(serializeAdminUser),
      total,
      page,
      pageSize,
    ),
  );
}

type CreateUserBody = {
  email: string;
  password: string;
  name?: string;
  roleId: string;
};

export async function POST(request: Request) {
  const access = await verifyAccess("manage-users");
  if (isAccessDenied(access)) {
    return access.error;
  }

  let body: CreateUserBody;
  try {
    body = (await request.json()) as CreateUserBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const name = body.name?.trim() || null;
  const { roleId } = body;

  if (!email || !password || !roleId) {
    return NextResponse.json(
      { error: "email, password, and roleId are required" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const role = await prisma.adminRole.findUnique({ where: { id: roleId } });
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.adminUser.create({
    data: {
      email,
      passwordHash,
      name,
      roleId,
    },
    include: adminUserInclude,
  });

  return NextResponse.json(serializeAdminUser(user), { status: 201 });
}
