import { execSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PERMISSION_DEFINITIONS,
  PERMISSIONS,
  ROLE_DEFINITIONS,
} from "@/lib/permissions";

let prisma: PrismaClient | null = null;

export function getTestDatabaseUrl(): string | null {
  return process.env.TEST_DATABASE_URL ?? null;
}

export function ensureTestEnv() {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Run: npm run test:db:start",
    );
  }

  if (!process.env.LICENSE_RSA_PRIVATE_KEY) {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    process.env.LICENSE_RSA_PRIVATE_KEY = privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString();
    process.env.LICENSE_RSA_PUBLIC_KEY = publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
  }

  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.HEARTBEAT_SEQUENCE_MODE =
    process.env.HEARTBEAT_SEQUENCE_MODE ?? "LEGACY_HEARTBEAT";
}

export function applySchema() {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION:
      process.env.PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION ??
      "Apply schema to isolated integration test database (nixlor_test on localhost)",
  };
  execSync("npx prisma db push --accept-data-loss", {
    stdio: "pipe",
    env,
  });
}

export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    const url = getTestDatabaseUrl();
    if (!url) throw new Error("TEST_DATABASE_URL is required");
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }),
    });
  }
  return prisma;
}

export async function resetDatabase() {
  const db = getTestPrisma();
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE
      "rate_limit_buckets",
      "idempotency_records",
      "audit_logs",
      "hardware_binding_records",
      "license_events",
      "license_transactions",
      "licenses",
      "installations",
      "clients",
      "software_modules",
      "alliance_partners",
      "role_permissions",
      "admin_users",
      "admin_roles",
      "permissions"
    RESTART IDENTITY CASCADE
  `);
}

export async function seedRolesAndPermissions() {
  const db = getTestPrisma();
  for (const permission of PERMISSION_DEFINITIONS) {
    await db.permission.upsert({
      where: { slug: permission.slug },
      update: permission,
      create: permission,
    });
  }

  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await db.adminRole.upsert({
      where: { slug: roleDef.slug },
      update: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
      create: {
        slug: roleDef.slug,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
    });

    const permissions = await db.permission.findMany({
      where: { slug: { in: [...roleDef.permissions] } },
    });

    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.rolePermission.createMany({
      data: permissions.map((p) => ({
        roleId: role.id,
        permissionId: p.id,
      })),
      skipDuplicates: true,
    });
  }
}

export async function prepareTestData() {
  await resetDatabase();
  return seedTestFixtures();
}

async function seedTestFixtures() {
  const db = getTestPrisma();
  await seedRolesAndPermissions();

  const superAdminRole = await db.adminRole.findUniqueOrThrow({
    where: { slug: "SUPER_ADMIN" },
    include: { permissions: { include: { permission: true } } },
  });
  const managerRole = await db.adminRole.findUniqueOrThrow({
    where: { slug: "MANAGER" },
    include: { permissions: { include: { permission: true } } },
  });
  const viewerRole = await db.adminRole.findUniqueOrThrow({
    where: { slug: "VIEWER" },
    include: { permissions: { include: { permission: true } } },
  });

  const passwordHash = await bcrypt.hash("test-password", 4);

  const superAdmin = await db.adminUser.create({
    data: {
      email: "super@nixlor.test",
      passwordHash,
      roleId: superAdminRole.id,
    },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  const manager = await db.adminUser.create({
    data: {
      email: "manager@nixlor.test",
      passwordHash,
      roleId: managerRole.id,
    },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  const viewer = await db.adminUser.create({
    data: {
      email: "viewer@nixlor.test",
      passwordHash,
      roleId: viewerRole.id,
    },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  const inactiveAdmin = await db.adminUser.create({
    data: {
      email: "inactive@nixlor.test",
      passwordHash,
      roleId: superAdminRole.id,
      isActive: false,
    },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  const partner = await db.alliancePartner.create({
    data: {
      name: "Test Partner",
      contactEmail: "partner@nixlor.test",
      region: "South",
    },
  });

  const client = await db.client.create({
    data: {
      businessName: "Test Client",
      contactEmail: "client@nixlor.test",
      alliancePartnerId: partner.id,
    },
  });

  const otherClient = await db.client.create({
    data: {
      businessName: "Other Client",
      contactEmail: "other@nixlor.test",
    },
  });

  const softwareModule = await db.softwareModule.create({
    data: {
      code: "TEST_MODULE",
      name: "Test Module",
      basePrice: 10000,
    },
  });

  const softwareModule2 = await db.softwareModule.create({
    data: {
      code: "VMS",
      name: "VMS Module",
      basePrice: 15000,
    },
  });

  const installation = await db.installation.create({
    data: {
      clientId: client.id,
      installationIdentifier: "chennai-site",
    },
  });

  const installation2 = await db.installation.create({
    data: {
      clientId: client.id,
      installationIdentifier: "vellore-site",
    },
  });

  const otherInstallation = await db.installation.create({
    data: {
      clientId: otherClient.id,
      installationIdentifier: "inst-other",
    },
  });

  return {
    superAdmin,
    manager,
    viewer,
    inactiveAdmin,
    partner,
    client,
    otherClient,
    module: softwareModule,
    module2: softwareModule2,
    installation,
    installation2,
    otherInstallation,
    permissions: PERMISSIONS,
  };
}

export async function disconnectTestPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export function heartbeatRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/v1/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
