import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  adminUserInclude,
  serializeAdminUser,
} from "@/lib/admin-users";
import type { VerifiedAdminUser } from "@/lib/server/require-auth";
import { createRequestId } from "@/lib/server/security";
import { assertSuperAdminRoleBoundary } from "@/lib/services/admin-user-security";
import { createAuditLog } from "@/lib/services/audit-log";

type CreateAdminUserInput = {
  email: string;
  password: string;
  name?: string | null;
  roleId: string;
};

type CreateAdminUserResult =
  | { ok: true; user: ReturnType<typeof serializeAdminUser> }
  | { ok: false; status: number; error: string };

export async function createAdminUser(
  actor: VerifiedAdminUser,
  input: CreateAdminUserInput,
): Promise<CreateAdminUserResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const name = input.name?.trim() || null;
  const { roleId } = input;

  if (!email || !password || !roleId) {
    return {
      ok: false,
      status: 400,
      error: "email, password, and roleId are required",
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      status: 400,
      error: "Password must be at least 8 characters",
    };
  }

  const role = await prisma.adminRole.findUnique({ where: { id: roleId } });
  if (!role) {
    return { ok: false, status: 404, error: "Role not found" };
  }

  const roleBoundary = assertSuperAdminRoleBoundary(actor, {
    targetRoleSlug: role.slug,
  });
  if (!roleBoundary.ok) {
    return { ok: false, status: 403, error: roleBoundary.message };
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      status: 409,
      error: "A user with this email already exists",
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const auditContext = { actorId: actor.id, requestId: createRequestId() };

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.adminUser.create({
      data: {
        email,
        passwordHash,
        name,
        roleId,
      },
      include: adminUserInclude,
    });

    await createAuditLog(
      {
        action: "CREATE_USER",
        entityType: "AdminUser",
        entityId: created.id,
        after: {
          email: created.email,
          name: created.name,
          roleId: created.roleId,
          roleSlug: created.role.slug,
          isActive: created.isActive,
        },
        context: auditContext,
      },
      tx,
    );

    return created;
  });

  return { ok: true, user: serializeAdminUser(user) };
}

type UpdateAdminUserInput = {
  email?: string;
  password?: string;
  name?: string;
  roleId?: string;
  isActive?: boolean;
};

type UpdateAdminUserResult =
  | { ok: true; user: ReturnType<typeof serializeAdminUser> }
  | { ok: false; status: number; error: string };

export async function updateAdminUser(
  actor: VerifiedAdminUser,
  userId: string,
  input: UpdateAdminUserInput,
): Promise<UpdateAdminUserResult> {
  const existing = await prisma.adminUser.findUnique({
    where: { id: userId },
    include: adminUserInclude,
  });

  if (!existing) {
    return { ok: false, status: 404, error: "User not found" };
  }

  if (userId === actor.id && input.isActive === false) {
    return {
      ok: false,
      status: 400,
      error: "You cannot deactivate your own account",
    };
  }

  if (input.roleId && input.roleId !== existing.roleId) {
    const role = await prisma.adminRole.findUnique({
      where: { id: input.roleId },
    });
    if (!role) {
      return { ok: false, status: 404, error: "Role not found" };
    }

    const roleBoundary = assertSuperAdminRoleBoundary(actor, {
      targetRoleSlug: role.slug,
      currentRoleSlug: existing.role.slug,
    });
    if (!roleBoundary.ok) {
      return { ok: false, status: 403, error: roleBoundary.message };
    }
  } else if (input.isActive === false && existing.isActive) {
    const roleBoundary = assertSuperAdminRoleBoundary(actor, {
      currentRoleSlug: existing.role.slug,
    });
    if (!roleBoundary.ok) {
      return { ok: false, status: 403, error: roleBoundary.message };
    }
  }

  const email = input.email?.trim().toLowerCase();
  if (email && email !== existing.email) {
    const duplicate = await prisma.adminUser.findUnique({ where: { email } });
    if (duplicate) {
      return {
        ok: false,
        status: 409,
        error: "A user with this email already exists",
      };
    }
  }

  if (input.password && input.password.length < 8) {
    return {
      ok: false,
      status: 400,
      error: "Password must be at least 8 characters",
    };
  }

  const auditContext = { actorId: actor.id, requestId: createRequestId() };
  const roleChanged = Boolean(input.roleId && input.roleId !== existing.roleId);
  const deactivated = input.isActive === false && existing.isActive;
  const reactivated = input.isActive === true && !existing.isActive;
  const profileChanged =
    Boolean(input.password) ||
    (email !== undefined && email !== existing.email) ||
    (input.name !== undefined && (input.name.trim() || null) !== existing.name);

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.adminUser.update({
      where: { id: userId },
      data: {
        email: email ?? undefined,
        name: input.name !== undefined ? input.name.trim() || null : undefined,
        roleId: input.roleId,
        isActive: input.isActive,
        passwordHash: input.password
          ? await bcrypt.hash(input.password, 12)
          : undefined,
      },
      include: adminUserInclude,
    });

    if (roleChanged) {
      await createAuditLog(
        {
          action: "CHANGE_USER_ROLE",
          entityType: "AdminUser",
          entityId: updated.id,
          before: {
            roleId: existing.roleId,
            roleSlug: existing.role.slug,
          },
          after: {
            roleId: updated.roleId,
            roleSlug: updated.role.slug,
          },
          context: auditContext,
        },
        tx,
      );
    }

    if (deactivated) {
      await createAuditLog(
        {
          action: "DEACTIVATE_USER",
          entityType: "AdminUser",
          entityId: updated.id,
          before: { isActive: true },
          after: { isActive: false },
          context: auditContext,
        },
        tx,
      );
    } else if (reactivated) {
      await createAuditLog(
        {
          action: "REACTIVATE_USER",
          entityType: "AdminUser",
          entityId: updated.id,
          before: { isActive: false },
          after: { isActive: true },
          context: auditContext,
        },
        tx,
      );
    }

    if (profileChanged) {
      await createAuditLog(
        {
          action: "UPDATE_USER",
          entityType: "AdminUser",
          entityId: updated.id,
          before: {
            email: existing.email,
            name: existing.name,
          },
          after: {
            email: updated.email,
            name: updated.name,
            passwordChanged: Boolean(input.password),
          },
          context: auditContext,
        },
        tx,
      );
    }

    return updated;
  });

  return { ok: true, user: serializeAdminUser(user) };
}

type DeactivateAdminUserResult =
  | { ok: true; user: ReturnType<typeof serializeAdminUser> }
  | { ok: false; status: number; error: string };

export async function deactivateAdminUser(
  actor: VerifiedAdminUser,
  userId: string,
): Promise<DeactivateAdminUserResult> {
  if (userId === actor.id) {
    return {
      ok: false,
      status: 400,
      error: "You cannot deactivate your own account",
    };
  }

  const existing = await prisma.adminUser.findUnique({
    where: { id: userId },
    include: adminUserInclude,
  });
  if (!existing) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const roleBoundary = assertSuperAdminRoleBoundary(actor, {
    currentRoleSlug: existing.role.slug,
  });
  if (!roleBoundary.ok) {
    return { ok: false, status: 403, error: roleBoundary.message };
  }

  const auditContext = { actorId: actor.id, requestId: createRequestId() };

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.adminUser.update({
      where: { id: userId },
      data: { isActive: false },
      include: adminUserInclude,
    });

    await createAuditLog(
      {
        action: "DEACTIVATE_USER",
        entityType: "AdminUser",
        entityId: updated.id,
        before: { isActive: true },
        after: { isActive: false },
        context: auditContext,
      },
      tx,
    );

    return updated;
  });

  return { ok: true, user: serializeAdminUser(user) };
}
