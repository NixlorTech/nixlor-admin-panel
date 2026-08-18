import "dotenv/config";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

type VerifyReport = {
  counts: Record<string, number>;
  issues: string[];
  warnings: string[];
};

async function main() {
  const report: VerifyReport = {
    counts: {},
    issues: [],
    warnings: [],
  };

  const [
    clients,
    partners,
    modules,
    licenses,
    transactions,
    installations,
    events,
    audits,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.alliancePartner.count(),
    prisma.softwareModule.count(),
    prisma.license.count(),
    prisma.licenseTransaction.count(),
    prisma.installation.count(),
    prisma.licenseEvent.count(),
    prisma.auditLog.count(),
  ]);

  report.counts = {
    clients,
    partners,
    modules,
    licenses,
    transactions,
    installations,
    licenseEvents: events,
    auditLogs: audits,
  };

  const licensesWithoutInstallation = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM licenses WHERE "installationId" IS NULL
  `;

  if (Number(licensesWithoutInstallation[0]?.count ?? 0) > 0) {
    report.issues.push(
      `${licensesWithoutInstallation[0]?.count} license(s) missing installationId`,
    );
  }

  const modulesMissingCode = await prisma.softwareModule.count({
    where: { code: null },
  });

  if (modulesMissingCode > 0) {
    report.warnings.push(
      `${modulesMissingCode} module(s) missing code`,
    );
  }

  const revokedButActiveHeartbeat = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM licenses
    WHERE status = 'REVOKED' AND "lastHeartbeatAt" > NOW() - INTERVAL '1 hour'
  `;
  if (Number(revokedButActiveHeartbeat[0]?.count ?? 0) > 0) {
    report.warnings.push(
      `${revokedButActiveHeartbeat[0]?.count} revoked license(s) with recent heartbeat — investigate`,
    );
  }

  const expiredActive = await prisma.license.count({
    where: { status: "ACTIVE", expiresAt: { lt: new Date() } },
  });
  if (expiredActive > 0) {
    report.warnings.push(
      `${expiredActive} ACTIVE license(s) past expiresAt — heartbeat will expire on next ping`,
    );
  }

  const orphanInstallations = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM installations i
    LEFT JOIN clients c ON c.id = i."clientId"
    WHERE c.id IS NULL
  `;
  if (Number(orphanInstallations[0]?.count ?? 0) > 0) {
    report.issues.push("Orphan installations detected (no client)");
  }

  const invalidInstallationRefs = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM licenses l
    LEFT JOIN installations i ON i.id = l."installationId"
    WHERE l."installationId" IS NOT NULL AND i.id IS NULL
  `;
  if (Number(invalidInstallationRefs[0]?.count ?? 0) > 0) {
    report.issues.push("Licenses reference missing installations");
  }

  const orphanLicenses = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM licenses l
    LEFT JOIN clients c ON c.id = l."clientId"
    WHERE c.id IS NULL
  `;
  if (Number(orphanLicenses[0]?.count ?? 0) > 0) {
    report.issues.push("Orphan licenses detected (no client)");
  }

  const clientMismatches = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM licenses l
    JOIN installations i ON i.id = l."installationId"
    WHERE l."clientId" <> i."clientId"
  `;
  if (Number(clientMismatches[0]?.count ?? 0) > 0) {
    report.issues.push("License/client installation clientId mismatch detected");
  }

  const duplicateActive = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT "installationId", "softwareModuleId", COUNT(*) AS c
      FROM licenses
      WHERE status = 'ACTIVE'
      GROUP BY 1, 2
      HAVING COUNT(*) > 1
    ) d
  `;
  if (Number(duplicateActive[0]?.count ?? 0) > 0) {
    report.issues.push("Duplicate active licenses per installation+module");
  }

  console.log("=== Nixlor DB Verify (read-only) ===");
  console.log(JSON.stringify(report, null, 2));

  if (report.issues.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
