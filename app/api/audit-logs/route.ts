import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import {
  buildPaginatedResponse,
  parsePaginationSearchParams,
} from "@/lib/pagination";
import { isAccessDenied, verifyAccess } from "@/lib/server/require-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await verifyAccess(PERMISSIONS.AUDIT_READ);
  if (isAccessDenied(access)) {
    return access.error;
  }

  const { page, pageSize } = parsePaginationSearchParams(
    new URL(request.url).searchParams,
  );

  const url = new URL(request.url);
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");
  const action = url.searchParams.get("action");
  const actorId = url.searchParams.get("actorId");
  const search = url.searchParams.get("search")?.trim();
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  const where = {
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(action ? { action: action as never } : {}),
    ...(actorId ? { actorId } : {}),
    ...(search
      ? {
          OR: [
            { entityId: { contains: search, mode: "insensitive" as const } },
            { entityType: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json(
    buildPaginatedResponse(
      logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actor: log.actor,
        before: log.before,
        after: log.after,
        metadata: log.metadata,
        requestId: log.requestId,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    ),
  );
}
