import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ADMIN_EMAIL } from "../lib/utils";
import {
  PERMISSION_DEFINITIONS,
  ROLE_DEFINITIONS,
  SUPER_ADMIN_ROLE_SLUG,
} from "../lib/permissions";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to your .env file before running db:seed.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
});

async function seedRolesAndPermissions() {
  for (const permission of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { slug: permission.slug },
      update: {
        name: permission.name,
        description: permission.description,
        group: permission.group,
      },
      create: permission,
    });
  }

  for (const role of ROLE_DEFINITIONS) {
    const permissions = await prisma.permission.findMany({
      where: {
        slug: {
          in: [...role.permissions],
        },
      },
    });

    const savedRole = await prisma.adminRole.upsert({
      where: { slug: role.slug },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
      create: {
        slug: role.slug,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
    });

    await prisma.rolePermission.deleteMany({
      where: { roleId: savedRole.id },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: savedRole.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
  }
}

async function main() {
  await seedRolesAndPermissions();

  const superAdminRole = await prisma.adminRole.findUnique({
    where: { slug: SUPER_ADMIN_ROLE_SLUG },
  });

  if (!superAdminRole) {
    throw new Error("Super Admin role was not seeded");
  }

  const password = process.env.ADMIN_SEED_PASSWORD ?? "ChangeMeNow!123";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash,
      roleId: superAdminRole.id,
      isActive: true,
      name: "Super Admin",
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      roleId: superAdminRole.id,
      name: "Super Admin",
      isActive: true,
    },
  });

  const usersWithoutRole = await prisma.adminUser.findMany({
    select: { id: true, roleId: true },
  });

  await Promise.all(
    usersWithoutRole
      .filter((user) => !user.roleId)
      .map((user) =>
        prisma.adminUser.update({
          where: { id: user.id },
          data: { roleId: superAdminRole.id },
        }),
      ),
  );

  console.log(`Seeded roles, permissions, and admin user: ${ADMIN_EMAIL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
