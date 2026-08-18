import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
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
import { licenseGenerateSchema, parseJsonBody } from "@/lib/validations";

export const dynamic = "force-dynamic";

const OPERATION = "generate-license";

export async function POST(request: Request) {
  const access = await verifyAccess("generate-licenses");
  if (isAccessDenied(access)) {
    return access.error;
  }

  const requestId = createRequestId();
  const idempotencyKey = getIdempotencyKey(request);

  if (idempotencyKey) {
    const cached = await getIdempotentResponse<Record<string, unknown>>(
      idempotencyKey,
      OPERATION,
    );
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = parseJsonBody(licenseGenerateSchema, json);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.message, 400);
  }

  const body = parsed.data;
  const commissionRateInput = body.commissionRate ?? DEFAULT_COMMISSION_RATE;

  const [client, softwareModule, installation, existingLicense] =
    await Promise.all([
      prisma.client.findUnique({ where: { id: body.clientId } }),
      prisma.softwareModule.findUnique({ where: { id: body.softwareModuleId } }),
      prisma.installation.findFirst({
        where: { id: body.installationId, clientId: body.clientId },
      }),
      prisma.license.findUnique({
        where: {
          installationId_softwareModuleId: {
            installationId: body.installationId,
            softwareModuleId: body.softwareModuleId,
          },
        },
      }),
    ]);

  if (!client) {
    return apiError("NOT_FOUND", "Client not found", 404);
  }

  if (!softwareModule) {
    return apiError("NOT_FOUND", "Software module not found", 404);
  }

  if (!installation) {
    return apiError("INSTALLATION_NOT_FOUND", "Installation not found for this client", 404);
  }

  const validFrom = new Date();
  const expiresAt = new Date(validFrom);
  expiresAt.setDate(expiresAt.getDate() + body.durationInDays);

  const transactionType = existingLicense
    ? TransactionType.RENEWAL
    : TransactionType.NEW_ISSUANCE;

  const tokenId = randomUUID();
  const hasPartner = Boolean(client.alliancePartnerId);
  const commissionRate = hasPartner ? commissionRateInput : null;
  const commissionAmount = hasPartner
    ? body.customPrice * (commissionRateInput / 100)
    : null;

  const auditContext = { actorId: access.user.id, requestId };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const upsertedLicense = await tx.license.upsert({
        where: {
          installationId_softwareModuleId: {
            installationId: body.installationId,
            softwareModuleId: body.softwareModuleId,
          },
        },
        create: {
          clientId: body.clientId,
          installationId: body.installationId,
          softwareModuleId: body.softwareModuleId,
          status: LicenseStatus.ACTIVE,
          activationStatus: ActivationStatus.ISSUED,
          validFrom,
          expiresAt,
          latestTokenId: tokenId,
        },
        update: {
          status: LicenseStatus.ACTIVE,
          activationStatus: ActivationStatus.ISSUED,
          validFrom,
          expiresAt,
          lastHeartbeatAt: null,
          latestTokenId: tokenId,
          revocationReason: null,
          revocationNotes: null,
        },
        include: { softwareModule: true },
      });

      const createdTransaction = await tx.licenseTransaction.create({
        data: {
          licenseId: upsertedLicense.id,
          transactionType,
          amountPaid: body.customPrice,
          basePriceAtTime: softwareModule.basePrice,
          commissionRate,
          commissionAmount,
          validFrom,
          validUntil: expiresAt,
          alliancePartnerId: client.alliancePartnerId,
          idempotencyKey: idempotencyKey ?? null,
        },
      });

      await recordLicenseEvent(
        {
          licenseId: upsertedLicense.id,
          installationId: body.installationId,
          eventType:
            transactionType === TransactionType.NEW_ISSUANCE ? "ISSUED" : "RENEWED",
          actorId: access.user.id,
          source: "admin",
          metadata: {
            transactionId: createdTransaction.id,
            amountPaid: body.customPrice,
            commissionRate,
          },
        },
        tx,
      );

      await createAuditLog(
        {
          action: "GENERATE_LICENSE",
          entityType: "License",
          entityId: upsertedLicense.id,
          after: {
            clientId: body.clientId,
            installationId: body.installationId,
            softwareModuleId: body.softwareModuleId,
            transactionType,
            expiresAt: expiresAt.toISOString(),
          },
          context: auditContext,
        },
        tx,
      );

      return { license: upsertedLicense, transaction: createdTransaction };
    });

    const token = signLicenseToken({
      clientId: body.clientId,
      module: softwareModule.code ?? softwareModule.name,
      expiresAt,
      jti: tokenId,
      installationId: body.installationId,
      validFrom,
    });

    const responseBody = {
      licenseId: result.license.id,
      installationId: body.installationId,
      transactionId: result.transaction.id,
      transactionType: result.transaction.transactionType,
      token,
      tokenId,
      expiresAt: result.license.expiresAt.toISOString(),
      durationInDays: body.durationInDays,
      customPrice: result.transaction.amountPaid,
      basePriceAtTime: result.transaction.basePriceAtTime,
      commissionRate: result.transaction.commissionRate,
      commissionAmount: result.transaction.commissionAmount,
      alliancePartnerId: result.transaction.alliancePartnerId,
      moduleCode: result.license.softwareModule.code ?? result.license.softwareModule.name,
      moduleName: result.license.softwareModule.name,
      deploymentConfig: {
        NIXLOR_CLIENT_ID: body.clientId,
        NIXLOR_MODULE_CODE: softwareModule.code ?? softwareModule.name,
        NIXLOR_MODULE_NAME: softwareModule.name,
        NIXLOR_HUB_URL: process.env.AUTH_URL ?? "https://admin.nixlor.com",
        NIXLOR_INSTALLATION_ID: body.installationId,
      },
    };

    if (idempotencyKey) {
      await storeIdempotentResponse(idempotencyKey, OPERATION, responseBody);
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return apiError(
        "DUPLICATE_LICENSE",
        "An active license already exists for this installation and module",
        409,
      );
    }
    throw error;
  }
}
