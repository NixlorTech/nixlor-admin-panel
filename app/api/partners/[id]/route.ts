import { NextResponse } from "next/server";
import { PartnerStatus } from "@/lib/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type UpdatePartnerBody = {
  name?: string;
  contactEmail?: string;
  phone?: string;
  region?: string;
  status?: PartnerStatus;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: UpdatePartnerBody;
  try {
    body = (await request.json()) as UpdatePartnerBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const partner = await prisma.alliancePartner.findUnique({ where: { id } });
  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  if (body.status && !Object.values(PartnerStatus).includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (name && name !== partner.name) {
    const duplicate = await prisma.alliancePartner.findUnique({
      where: { name },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "A partner with this name already exists" },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.alliancePartner.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(body.contactEmail?.trim()
        ? { contactEmail: body.contactEmail.trim() }
        : {}),
      ...(body.phone !== undefined
        ? { phone: body.phone.trim() || null }
        : {}),
      ...(body.region?.trim() ? { region: body.region.trim() } : {}),
      ...(body.status ? { status: body.status } : {}),
    },
    include: {
      transactions: {
        select: { amountPaid: true },
      },
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    contactEmail: updated.contactEmail,
    phone: updated.phone,
    region: updated.region,
    status: updated.status,
    totalRevenue: updated.transactions.reduce(
      (sum, transaction) => sum + transaction.amountPaid,
      0,
    ),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
