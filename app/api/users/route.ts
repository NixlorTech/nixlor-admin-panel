import { NextResponse } from "next/server";
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
import { createAdminUser } from "@/lib/services/admin-user-mutations";

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

  const result = await createAdminUser(access.user, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.user, { status: 201 });
}
