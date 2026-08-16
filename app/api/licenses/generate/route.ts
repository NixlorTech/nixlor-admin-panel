import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { LicenseStatus, TransactionType } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { signLicenseToken } from "@/lib/license";
import { DEFAULT_COMMISSION_RATE } from "@/lib/license-constants";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";

export const dynamic = "force-dynamic";

type GenerateLicenseBody = {
  clientId: string;
  softwareModuleId: string;
  durationInDays: number;
  customPrice: number;
  commissionRate?: number;
};

export async function POST(request: Request) {
  const access = await verifyAccess("generate-licenses");
  if (isAccessDenied(access)) {
    return access.error;
  }

  let body: GenerateLicenseBody;
  try {
    body = (await request.json()) as GenerateLicenseBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { clientId, softwareModuleId, durationInDays, customPrice } = body;

  if (
    !clientId ||
    !softwareModuleId ||
    !durationInDays ||
    customPrice == null
  ) {
    return NextResponse.json(
      {
        error:
          "clientId, softwareModuleId, durationInDays, and customPrice are required",
      },
      { status: 400 },
    );
  }

  if (!Number.isFinite(durationInDays) || durationInDays < 1) {
    return NextResponse.json(
      { error: "durationInDays must be a positive number" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(customPrice) || customPrice < 0) {
    return NextResponse.json(
      { error: "customPrice must be a non-negative number" },
      { status: 400 },
    );
  }

  const commissionRateInput = body.commissionRate ?? DEFAULT_COMMISSION_RATE;
  if (
    !Number.isFinite(commissionRateInput) ||
    commissionRateInput < 0 ||
    commissionRateInput > 100
  ) {
    return NextResponse.json(
      { error: "commissionRate must be between 0 and 100" },
      { status: 400 },
    );
  }

  const [client, softwareModule, existingLicense] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.softwareModule.findUnique({ where: { id: softwareModuleId } }),
    prisma.license.findUnique({
      where: {
        clientId_softwareModuleId: {
          clientId,
          softwareModuleId,
        },
      },
    }),
  ]);

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (!softwareModule) {
    return NextResponse.json(
      { error: "Software module not found" },
      { status: 404 },
    );
  }

  const validFrom = new Date();
  const expiresAt = new Date(validFrom);
  expiresAt.setDate(expiresAt.getDate() + durationInDays);

  const transactionType = existingLicense
    ? TransactionType.RENEWAL
    : TransactionType.NEW_ISSUANCE;

  const tokenId = randomUUID();
  const hasPartner = Boolean(client.alliancePartnerId);
  const commissionRate = hasPartner ? commissionRateInput : null;
  const commissionAmount = hasPartner
    ? customPrice * (commissionRateInput / 100)
    : null;

  const { license, transaction } = await prisma.$transaction(async (tx) => {
    const upsertedLicense = await tx.license.upsert({
      where: {
        clientId_softwareModuleId: {
          clientId,
          softwareModuleId,
        },
      },
      create: {
        clientId,
        softwareModuleId,
        status: LicenseStatus.ACTIVE,
        validFrom,
        expiresAt,
        latestTokenId: tokenId,
      },
      update: {
        status: LicenseStatus.ACTIVE,
        validFrom,
        expiresAt,
        lastHeartbeatAt: null,
        latestTokenId: tokenId,
      },
      include: {
        softwareModule: true,
      },
    });

    const createdTransaction = await tx.licenseTransaction.create({
      data: {
        licenseId: upsertedLicense.id,
        transactionType,
        amountPaid: customPrice,
        basePriceAtTime: softwareModule.basePrice,
        commissionRate,
        commissionAmount,
        validFrom,
        validUntil: expiresAt,
        alliancePartnerId: client.alliancePartnerId,
      },
    });

    return {
      license: upsertedLicense,
      transaction: createdTransaction,
    };
  });

  const token = signLicenseToken({
    clientId,
    module: softwareModule.name,
    expiresAt,
    jti: tokenId,
  });

  return NextResponse.json({
    licenseId: license.id,
    transactionId: transaction.id,
    transactionType: transaction.transactionType,
    token,
    tokenId,
    expiresAt: license.expiresAt.toISOString(),
    durationInDays,
    customPrice: transaction.amountPaid,
    basePriceAtTime: transaction.basePriceAtTime,
    commissionRate: transaction.commissionRate,
    commissionAmount: transaction.commissionAmount,
    alliancePartnerId: transaction.alliancePartnerId,
    moduleName: license.softwareModule.name,
  });
}
