import { createHash, randomUUID } from "crypto";
import type { Prisma } from "@/lib/generated/prisma/client";

export function hashHardwareId(hardwareId: string): string {
  return createHash("sha256").update(hardwareId.trim()).digest("hex");
}

export function createRequestId(): string {
  return randomUUID();
}

export type AuditContext = {
  actorId?: string | null;
  requestId?: string;
};

export type JsonValue = Prisma.InputJsonValue;
