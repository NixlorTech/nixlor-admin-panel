import { auth } from "@/auth";
import { LicenseStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const licenseInclude = {
  softwareModule: true,
  transactions: {
    include: {
      alliancePartner: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

const clientInclude = {
  alliancePartner: true,
  licenses: {
    include: licenseInclude,
    orderBy: { expiresAt: "desc" as const },
  },
} as const;

export async function getDashboardMetrics() {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + THIRTY_DAYS_MS);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [activeClients, expiringSoon, revokedLicenses, revenueAggregate] =
    await Promise.all([
      prisma.client.count({
        where: {
          licenses: {
            some: {
              status: LicenseStatus.ACTIVE,
              expiresAt: { gt: now },
            },
          },
        },
      }),
      prisma.license.count({
        where: {
          status: LicenseStatus.ACTIVE,
          expiresAt: {
            gt: now,
            lte: thirtyDaysFromNow,
          },
        },
      }),
      prisma.license.count({
        where: {
          status: LicenseStatus.REVOKED,
        },
      }),
      prisma.licenseTransaction.aggregate({
        _sum: { amountPaid: true },
        where: {
          createdAt: { gte: startOfYear },
        },
      }),
    ]);

  return {
    activeClients,
    expiringSoon,
    revokedLicenses,
    totalRevenue: revenueAggregate._sum.amountPaid ?? 0,
  };
}

export async function getClientsWithLicenses() {
  return prisma.client.findMany({
    include: clientInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getClientById(clientId: string) {
  return prisma.client.findUnique({
    where: { id: clientId },
    include: clientInclude,
  });
}

export async function getSoftwareModules() {
  return prisma.softwareModule.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getAlliancePartners() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const partners = await prisma.alliancePartner.findMany({
    include: {
      transactions: {
        select: {
          amountPaid: true,
          commissionAmount: true,
          createdAt: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return partners.map((partner) => ({
    id: partner.id,
    name: partner.name,
    contactEmail: partner.contactEmail,
    phone: partner.phone,
    region: partner.region,
    status: partner.status,
    totalRevenue: partner.transactions.reduce(
      (sum, transaction) => sum + transaction.amountPaid,
      0,
    ),
    pendingCommissions: partner.transactions
      .filter(
        (transaction) =>
          transaction.createdAt >= startOfMonth &&
          transaction.createdAt <= endOfMonth,
      )
      .reduce((sum, transaction) => sum + (transaction.commissionAmount ?? 0), 0),
    createdAt: partner.createdAt,
    updatedAt: partner.updatedAt,
  }));
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return session;
}

export function serializeTransaction(
  transaction: Awaited<
    ReturnType<typeof getClientsWithLicenses>
  >[number]["licenses"][number]["transactions"][number],
  moduleName: string,
) {
  return {
    id: transaction.id,
    licenseId: transaction.licenseId,
    moduleName,
    transactionType: transaction.transactionType,
    amountPaid: transaction.amountPaid,
    basePriceAtTime: transaction.basePriceAtTime,
    commissionRate: transaction.commissionRate,
    commissionAmount: transaction.commissionAmount,
    alliancePartnerId: transaction.alliancePartnerId,
    alliancePartnerName: transaction.alliancePartner?.name ?? null,
    validFrom: transaction.validFrom.toISOString(),
    validUntil: transaction.validUntil.toISOString(),
    createdAt: transaction.createdAt.toISOString(),
  };
}

export function serializeLicense(
  license: Awaited<
    ReturnType<typeof getClientsWithLicenses>
  >[number]["licenses"][number],
) {
  return {
    id: license.id,
    clientId: license.clientId,
    softwareModuleId: license.softwareModuleId,
    moduleName: license.softwareModule.name,
    status: license.status,
    validFrom: license.validFrom.toISOString(),
    expiresAt: license.expiresAt.toISOString(),
    lastHeartbeatAt: license.lastHeartbeatAt?.toISOString() ?? null,
    hardwareId: license.hardwareId,
    latestTokenId: license.latestTokenId,
    transactions: license.transactions.map((transaction) =>
      serializeTransaction(transaction, license.softwareModule.name),
    ),
  };
}

export function serializeClient(
  client: Awaited<ReturnType<typeof getClientsWithLicenses>>[number],
) {
  return {
    id: client.id,
    businessName: client.businessName,
    contactEmail: client.contactEmail,
    phone: client.phone,
    region: client.region,
    alliancePartnerId: client.alliancePartnerId,
    alliancePartnerName: client.alliancePartner?.name ?? null,
    createdAt: client.createdAt.toISOString(),
    licenses: client.licenses.map(serializeLicense),
  };
}

export function getClientTransactions(
  client: NonNullable<Awaited<ReturnType<typeof getClientById>>>,
) {
  return client.licenses
    .flatMap((license) =>
      license.transactions.map((transaction) =>
        serializeTransaction(transaction, license.softwareModule.name),
      ),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}
