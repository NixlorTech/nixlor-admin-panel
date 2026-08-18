import { z } from "zod";

const cuid = z.string().min(10).max(64);
const shortText = z.string().trim().min(1).max(128);
const mediumText = z.string().trim().min(1).max(512);

export const licenseGenerateSchema = z.object({
  clientId: cuid,
  softwareModuleId: cuid,
  installationId: cuid,
  durationInDays: z.number().int().min(1).max(3650),
  customPrice: z.number().min(0),
  commissionRate: z.number().min(0).max(100).optional(),
});

export const licenseRenewSchema = z.object({
  durationInDays: z.number().int().min(1).max(3650),
  customPrice: z.number().min(0),
  commissionRate: z.number().min(0).max(100).optional(),
});

export const licenseRebindSchema = z.object({
  reason: mediumText,
});

export const licenseStatusSchema = z.object({
  status: z.enum(["ACTIVE", "REVOKED", "EXPIRED"]),
  revocationReason: z
    .enum([
      "PAYMENT_ISSUE",
      "FRAUD",
      "CUSTOMER_REQUEST",
      "SECURITY",
      "ADMIN_ACTION",
      "CONTRACT_TERMINATED",
    ])
    .optional(),
  revocationNotes: z.string().trim().max(2000).optional(),
});

export const heartbeatSchema = z.object({
  clientId: cuid,
  module: shortText,
  hardwareId: mediumText,
  installationId: cuid,
  softwareVersion: z.string().trim().max(64).optional(),
  schemaVersion: z.string().trim().max(64).optional(),
  sequence: z.number().int().nonnegative().optional(),
});

export const installationCreateSchema = z.object({
  clientId: cuid,
  installationIdentifier: shortText,
  environment: z.string().trim().max(64).optional(),
  hostname: z.string().trim().max(255).optional(),
});

export const clientCreateSchema = z.object({
  businessName: shortText,
  contactEmail: z.string().email().max(255),
  phone: z.string().trim().max(32).optional(),
  region: z.string().trim().max(128).optional(),
  alliancePartnerId: cuid.optional(),
});

export function parseJsonBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
):
  | { success: true; data: T }
  | { success: false; message: string } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ");
    return { success: false, message };
  }
  return { success: true, data: parsed.data };
}
