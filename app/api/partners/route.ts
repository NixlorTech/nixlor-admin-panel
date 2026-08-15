import { NextResponse } from "next/server";
import { PartnerStatus, Prisma } from "@/lib/generated/prisma/client";
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

  const where: Prisma.AlliancePartnerWhereInput | undefined = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { contactEmail: { contains: search, mode: "insensitive" } },
          { region: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }
    : undefined;

  const [partners, total] = await Promise.all([
    prisma.alliancePartner.findMany({
      where,
      include: {
        transactions: {
          select: { amountPaid: true },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.alliancePartner.count({ where }),
  ]);

  const data = partners.map((partner) => ({
    id: partner.id,
    name: partner.name,
    contactEmail: partner.contactEmail,
    phone: partner.phone,
    region: partner.region,
    status: partner.status,
    totalRevenue: partner.transactions.reduce(
      (sum, transaction) => sum + transaction.amountPaid,
      0,
    ),
    createdAt: partner.createdAt.toISOString(),
    updatedAt: partner.updatedAt.toISOString(),
  }));

  return NextResponse.json(
    buildPaginatedResponse(data, total, page, pageSize),
  );
}

type CreatePartnerBody = {
  name: string;
  contactEmail: string;
  phone?: string;
  region: string;
  status?: PartnerStatus;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreatePartnerBody;
  try {
    body = (await request.json()) as CreatePartnerBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const contactEmail = body.contactEmail?.trim();
  const region = body.region?.trim();

  if (!name || !contactEmail || !region) {
    return NextResponse.json(
      { error: "name, contactEmail, and region are required" },
      { status: 400 },
    );
  }

  if (body.status && !Object.values(PartnerStatus).includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.alliancePartner.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { error: "A partner with this name already exists" },
      { status: 409 },
    );
  }

  const partner = await prisma.alliancePartner.create({
    data: {
      name,
      contactEmail,
      phone: body.phone?.trim() || null,
      region,
      status: body.status ?? PartnerStatus.ACTIVE,
    },
  });

  return NextResponse.json(
    {
      ...partner,
      totalRevenue: 0,
      createdAt: partner.createdAt.toISOString(),
      updatedAt: partner.updatedAt.toISOString(),
    },
    { status: 201 },
  );
}
