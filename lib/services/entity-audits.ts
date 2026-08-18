import { prisma } from "@/lib/prisma";

export async function fetchEntityAuditSummaries(
  entityType: string,
  entityId: string,
  limit = 20,
) {
  const audits = await prisma.auditLog.findMany({
    where: { entityType, entityId },
    include: { actor: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return audits.map((audit) => ({
    id: audit.id,
    action: audit.action,
    createdAt: audit.createdAt.toISOString(),
    actor: audit.actor,
  }));
}
