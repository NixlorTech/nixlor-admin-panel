import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  ActivationStatus,
  LicenseStatus,
  TransactionType,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { signLicenseToken } from "@/lib/license";
import { DEFAULT_COMMISSION_RATE } from "@/lib/license-constants";
import { apiError } from "@/lib/server/api-response";
import { createRequestId } from "@/lib/server/security";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";
import { createAuditLog } from "@/lib/services/audit-log";
import {
  getIdempotencyKey,
  getIdempotentResponse,
  storeIdempotentResponse,
} from "@/lib/services/idempotency";
import { recordLicenseEvent } from "@/lib/services/license-events";
import { PERMISSIONS } from "@/lib/permissions";
import { licenseRenewSchema, parseJsonBody } from "@/lib/validations";

export const dynamic = "force-dynamic";

type RenewBody = {
  durationInDays: number;
  customPrice: number;
  commissionRate?: number;
};

const OPERATION = "renew-license";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await verifyAccess(PERMISSIONS.LICENSES_RENEW);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const { id } = await context.params;
  const idempotencyKey = getIdempotencyKey(request);
  const requestId = createRequestId();

  if (idempotencyKey) {
    const cached = await getIdempotentResponse<Record<string, unknown>>(
      idempotencyKey,
      OPERATION,
    );
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  let body: RenewBody;
  try {
    body = (await request.json()) as RenewBody;
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = parseJsonBody(licenseRenewSchema, body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.message, 400);
  }

  const renewBody = parsed.data;

  const license = await prisma.license.findUnique({
    where: { id },
    include: {
      client: true,
      softwareModule: true,
    },
  });

  if (!license) {
    return apiError("NOT_FOUND", "License not found", 404);
  }

  const validFrom = new Date();
  const expiresAt = new Date(validFrom);
  expiresAt.setDate(expiresAt.getDate() + renewBody.durationInDays);

  const commissionRateInput = renewBody.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const hasPartner = Boolean(license.client.alliancePartnerId);
  const commissionRate = hasPartner ? commissionRateInput : null;
  const commissionAmount = hasPartner
    ? renewBody.customPrice * (commissionRateInput / 100)
    : null;

  const tokenId = randomUUID();

  const result = await prisma.$transaction(async (tx) => {
    const updatedLicense = await tx.license.update({
      where: { id },
      data: {
        status: LicenseStatus.ACTIVE,
        activationStatus: ActivationStatus.ACTIVATED,
        validFrom,
        expiresAt,
        latestTokenId: tokenId,
        revocationReason: null,
        revocationNotes: null,
      },
      include: { softwareModule: true },
    });

    const transaction = await tx.licenseTransaction.create({
      data: {
        licenseId: id,
        transactionType: TransactionType.RENEWAL,
        amountPaid: renewBody.customPrice,
        basePriceAtTime: license.softwareModule.basePrice,
        commissionRate,
        commissionAmount,
        validFrom,
        validUntil: expiresAt,
        alliancePartnerId: license.client.alliancePartnerId,
        idempotencyKey: idempotencyKey ?? null,
      },
    });

    await recordLicenseEvent(
      {
        licenseId: id,
        installationId: license.installationId,
        eventType: "RENEWED",
        actorId: access.user.id,
        source: "admin",
        metadata: { transactionId: transaction.id, amountPaid: renewBody.customPrice },
      },
      tx,
    );

    await createAuditLog(
      {
        action: "RENEW_LICENSE",
        entityType: "License",
        entityId: id,
        after: {
          expiresAt: expiresAt.toISOString(),
          transactionId: transaction.id,
        },
        context: { actorId: access.user.id, requestId },
      },
      tx,
    );

    return { license: updatedLicense, transaction };
  });

  const token = signLicenseToken({
    clientId: license.clientId,
    module: result.license.softwareModule.code ?? result.license.softwareModule.name,
    expiresAt,
    jti: tokenId,
    installationId: license.installationId,
    validFrom,
  });

  const responseBody = {
    licenseId: id,
    transactionId: result.transaction.id,
    token,
    tokenId,
    expiresAt: expiresAt.toISOString(),
    amountPaid: result.transaction.amountPaid,
    commissionRate: result.transaction.commissionRate,
    commissionAmount: result.transaction.commissionAmount,
  };

  if (idempotencyKey) {
    await storeIdempotentResponse(
      idempotencyKey,
      OPERATION,
      responseBody as Record<string, unknown>,
    );
  }

  return NextResponse.json(responseBody);
}
