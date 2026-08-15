import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  buildPaginatedResponse,
  parsePaginationSearchParams,
} from "@/lib/pagination";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { page, pageSize, search } = parsePaginationSearchParams(
    new URL(request.url).searchParams,
  );

  const where: Prisma.SoftwareModuleWhereInput | undefined = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }
    : undefined;

  const [modules, total] = await Promise.all([
    prisma.softwareModule.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.softwareModule.count({ where }),
  ]);

  const data = modules.map((softwareModule) => ({
    id: softwareModule.id,
    name: softwareModule.name,
    description: softwareModule.description,
    basePrice: softwareModule.basePrice,
    createdAt: softwareModule.createdAt.toISOString(),
    updatedAt: softwareModule.updatedAt.toISOString(),
  }));

  return NextResponse.json(
    buildPaginatedResponse(data, total, page, pageSize),
  );
}

type CreateModuleBody = {
  name: string;
  description?: string;
  basePrice?: number;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateModuleBody;
  try {
    body = (await request.json()) as CreateModuleBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const basePrice = body.basePrice ?? 0;
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    return NextResponse.json(
      { error: "basePrice must be a non-negative number" },
      { status: 400 },
    );
  }

  const existing = await prisma.softwareModule.findUnique({
    where: { name },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A module with this name already exists" },
      { status: 409 },
    );
  }

  const createdModule = await prisma.softwareModule.create({
    data: {
      name,
      description: body.description?.trim() || null,
      basePrice,
    },
  });

  return NextResponse.json(createdModule, { status: 201 });
}
