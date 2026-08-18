import type { AuditAction, Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuditContext, JsonValue } from "@/lib/server/security";

type CreateAuditLogInput = {
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: JsonValue;
  after?: JsonValue;
  metadata?: JsonValue;
  context?: AuditContext;
};

export async function createAuditLog(
  input: CreateAuditLogInput,
  tx: Prisma.TransactionClient = prisma,
) {
  return tx.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      metadata: input.metadata,
      actorId: input.context?.actorId ?? null,
      requestId: input.context?.requestId ?? null,
    },
  });
}
