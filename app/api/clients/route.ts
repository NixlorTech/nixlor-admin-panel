import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildPaginatedResponse,
  parsePaginationSearchParams,
} from "@/lib/pagination";
import { serializeClient } from "@/lib/dashboard";
import { PERMISSIONS } from "@/lib/permissions";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await verifyAccess(PERMISSIONS.CLIENTS_READ);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const { page, pageSize, search } = parsePaginationSearchParams(
    new URL(request.url).searchParams,
  );

  const where: Prisma.ClientWhereInput | undefined = search
    ? {
        OR: [
          { businessName: { contains: search, mode: "insensitive" } },
          { contactEmail: { contains: search, mode: "insensitive" } },
          { region: { contains: search, mode: "insensitive" } },
          {
            alliancePartner: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        ],
      }
    : undefined;

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        alliancePartner: true,
        licenses: {
          include: {
            softwareModule: true,
            transactions: {
              include: {
                alliancePartner: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { expiresAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ]);

  return NextResponse.json(
    buildPaginatedResponse(
      clients.map(serializeClient),
      total,
      page,
      pageSize,
    ),
  );
}

type CreateClientBody = {
  businessName: string;
  contactEmail: string;
  phone?: string;
  region?: string;
  alliancePartnerId?: string;
};

export async function POST(request: Request) {
  const access = await verifyAccess(PERMISSIONS.CLIENTS_WRITE);
  if (isAccessDenied(access)) {
    return access.error;
  }

  let body: CreateClientBody;
  try {
    body = (await request.json()) as CreateClientBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { businessName, contactEmail, phone, region, alliancePartnerId } = body;

  if (!businessName?.trim() || !contactEmail?.trim()) {
    return NextResponse.json(
      { error: "businessName and contactEmail are required" },
      { status: 400 },
    );
  }

  if (alliancePartnerId) {
    const partner = await prisma.alliancePartner.findUnique({
      where: { id: alliancePartnerId },
    });
    if (!partner) {
      return NextResponse.json(
        { error: "Alliance partner not found" },
        { status: 404 },
      );
    }
  }

  const client = await prisma.client.create({
    data: {
      businessName: businessName.trim(),
      contactEmail: contactEmail.trim(),
      phone: phone?.trim() || null,
      region: region?.trim() || null,
      alliancePartnerId: alliancePartnerId || null,
    },
    include: {
      alliancePartner: true,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
