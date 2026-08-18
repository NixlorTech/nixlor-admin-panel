import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import {
  buildPaginatedResponse,
  parsePaginationSearchParams,
} from "@/lib/pagination";
import { apiError } from "@/lib/server/api-response";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";
import { createAuditLog } from "@/lib/services/audit-log";
import {
  createInstallation,
  deriveInstallationHealth,
} from "@/lib/services/installations";
import { installationCreateSchema, parseJsonBody } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await verifyAccess(PERMISSIONS.INSTALLATIONS_READ);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationSearchParams(url.searchParams);
  const clientId = url.searchParams.get("clientId");
  const partnerId = url.searchParams.get("partnerId");
  const moduleId = url.searchParams.get("moduleId");
  const status = url.searchParams.get("status");

  const where: Prisma.InstallationWhereInput = {
    ...(clientId ? { clientId } : {}),
    ...(partnerId ? { client: { alliancePartnerId: partnerId } } : {}),
    ...(status ? { status: status as never } : {}),
    ...(moduleId
      ? { licenses: { some: { softwareModuleId: moduleId } } }
      : {}),
    ...(search
      ? {
          OR: [
            { installationIdentifier: { contains: search, mode: "insensitive" } },
            { hostname: { contains: search, mode: "insensitive" } },
            { client: { businessName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [installations, total] = await Promise.all([
    prisma.installation.findMany({
      where,
      include: {
        client: { select: { businessName: true } },
        licenses: { include: { softwareModule: true } },
      },
      orderBy: { lastHeartbeatAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.installation.count({ where }),
  ]);

  const data = installations.map((installation) => ({
    id: installation.id,
    clientId: installation.clientId,
    clientName: installation.client.businessName,
    installationIdentifier: installation.installationIdentifier,
    status: installation.status,
    environment: installation.environment,
    hostname: installation.hostname,
    softwareVersion: installation.softwareVersion,
    schemaVersion: installation.schemaVersion,
    activatedAt: installation.activatedAt?.toISOString() ?? null,
    lastHeartbeatAt: installation.lastHeartbeatAt?.toISOString() ?? null,
    health: deriveInstallationHealth(installation),
    licenses: installation.licenses.map((license) => ({
      id: license.id,
      moduleCode: license.softwareModule.code,
      moduleName: license.softwareModule.name,
      status: license.status,
    })),
    createdAt: installation.createdAt.toISOString(),
  }));

  if (clientId) {
    return NextResponse.json(data);
  }

  return NextResponse.json(buildPaginatedResponse(data, total, page, pageSize));
}

export async function POST(request: Request) {
  const access = await verifyAccess(PERMISSIONS.INSTALLATIONS_WRITE);
  if (isAccessDenied(access)) {
    return access.error;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = parseJsonBody(installationCreateSchema, json);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.message, 400);
  }

  const body = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: body.clientId } });
  if (!client) {
    return apiError("NOT_FOUND", "Client not found", 404);
  }

  const installation = await prisma.$transaction(async (tx) => {
    const created = await createInstallation(
      {
        clientId: body.clientId,
        installationIdentifier: body.installationIdentifier,
        environment: body.environment,
        hostname: body.hostname,
      },
      tx,
    );

    await createAuditLog(
      {
        action: "CREATE_INSTALLATION",
        entityType: "Installation",
        entityId: created.id,
        after: {
          clientId: created.clientId,
          installationIdentifier: created.installationIdentifier,
        },
        context: { actorId: access.user.id },
      },
      tx,
    );

    return created;
  });

  return NextResponse.json(installation, { status: 201 });
}
