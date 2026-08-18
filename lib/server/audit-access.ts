import { fetchEntityAuditSummaries } from "@/lib/services/entity-audits";
import type { VerifiedAdminUser } from "@/lib/server/require-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { userHasPermission } from "@/lib/server/require-auth";

export function canReadAuditLogs(user: VerifiedAdminUser): boolean {
  return userHasPermission(user, PERMISSIONS.AUDIT_READ);
}

export async function resolveEntityAuditsForUser(
  user: VerifiedAdminUser,
  entityType: string,
  entityId: string,
) {
  if (!canReadAuditLogs(user)) {
    return [];
  }

  return fetchEntityAuditSummaries(entityType, entityId);
}
