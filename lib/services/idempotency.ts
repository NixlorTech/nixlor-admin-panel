import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export async function getIdempotentResponse<T>(
  key: string,
  operation: string,
): Promise<T | null> {
  const record = await prisma.idempotencyRecord.findUnique({
    where: { key },
  });

  if (!record || record.operation !== operation) {
    return null;
  }

  if (record.expiresAt < new Date()) {
    await prisma.idempotencyRecord.delete({ where: { key } }).catch(() => null);
    return null;
  }

  return record.responseBody as T;
}

export async function storeIdempotentResponse(
  key: string,
  operation: string,
  responseBody: Record<string, unknown>,
  tx: Prisma.TransactionClient = prisma,
) {
  const expiresAt = new Date(Date.now() + DEFAULT_TTL_MS);
  const jsonBody = responseBody as Prisma.InputJsonValue;

  await tx.idempotencyRecord.upsert({
    where: { key },
    create: {
      key,
      operation,
      responseBody: jsonBody,
      expiresAt,
    },
    update: {
      responseBody: jsonBody,
      expiresAt,
    },
  });
}

export function getIdempotencyKey(request: Request): string | null {
  return request.headers.get("Idempotency-Key")?.trim() || null;
}
