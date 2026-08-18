export const PERMISSIONS = {
  DASHBOARD_READ: "dashboard.read",
  USERS_READ: "users.read",
  USERS_WRITE: "users.write",
  USERS_DELETE: "users.delete",
  CLIENTS_READ: "clients.read",
  CLIENTS_WRITE: "clients.write",
  PARTNERS_READ: "partners.read",
  PARTNERS_WRITE: "partners.write",
  MODULES_READ: "modules.read",
  MODULES_WRITE: "modules.write",
  LICENSES_GENERATE: "licenses.generate",
  LICENSES_REVOKE: "licenses.revoke",
  LICENSES_RENEW: "licenses.renew",
  LICENSES_REBIND_HARDWARE: "licenses.rebind_hardware",
  INSTALLATIONS_READ: "installations.read",
  INSTALLATIONS_WRITE: "installations.write",
  AUDIT_READ: "audit.read",
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_DEFINITIONS: Array<{
  slug: PermissionSlug;
  name: string;
  description: string;
  group: string;
}> = [
  {
    slug: PERMISSIONS.DASHBOARD_READ,
    name: "View Dashboard",
    description: "Access overview metrics and dashboard pages",
    group: "Dashboard",
  },
  {
    slug: PERMISSIONS.USERS_READ,
    name: "View Users",
    description: "View admin users and their roles",
    group: "Users",
  },
  {
    slug: PERMISSIONS.USERS_WRITE,
    name: "Manage Users",
    description: "Create and update admin users",
    group: "Users",
  },
  {
    slug: PERMISSIONS.USERS_DELETE,
    name: "Deactivate Users",
    description: "Deactivate or remove admin users",
    group: "Users",
  },
  {
    slug: PERMISSIONS.CLIENTS_READ,
    name: "View Clients",
    description: "View client records and license details",
    group: "Clients",
  },
  {
    slug: PERMISSIONS.CLIENTS_WRITE,
    name: "Manage Clients",
    description: "Create and update client records",
    group: "Clients",
  },
  {
    slug: PERMISSIONS.PARTNERS_READ,
    name: "View Partners",
    description: "View alliance partner profiles",
    group: "Partners",
  },
  {
    slug: PERMISSIONS.PARTNERS_WRITE,
    name: "Manage Partners",
    description: "Create and update alliance partners",
    group: "Partners",
  },
  {
    slug: PERMISSIONS.MODULES_READ,
    name: "View Modules",
    description: "View software module catalog",
    group: "Modules",
  },
  {
    slug: PERMISSIONS.MODULES_WRITE,
    name: "Manage Modules",
    description: "Create and update software modules",
    group: "Modules",
  },
  {
    slug: PERMISSIONS.LICENSES_GENERATE,
    name: "Generate Licenses",
    description: "Issue new license tokens",
    group: "Licenses",
  },
  {
    slug: PERMISSIONS.LICENSES_REVOKE,
    name: "Revoke Licenses",
    description: "Revoke active client licenses",
    group: "Licenses",
  },
  {
    slug: PERMISSIONS.LICENSES_RENEW,
    name: "Renew Licenses",
    description: "Renew existing client licenses",
    group: "Licenses",
  },
  {
    slug: PERMISSIONS.LICENSES_REBIND_HARDWARE,
    name: "Rebind Hardware",
    description: "Reset hardware binding for license reinstalls",
    group: "Licenses",
  },
  {
    slug: PERMISSIONS.INSTALLATIONS_READ,
    name: "View Installations",
    description: "View on-prem installation records and health",
    group: "Installations",
  },
  {
    slug: PERMISSIONS.INSTALLATIONS_WRITE,
    name: "Manage Installations",
    description: "Create and update installation records",
    group: "Installations",
  },
  {
    slug: PERMISSIONS.AUDIT_READ,
    name: "View Audit Logs",
    description: "View immutable admin audit history",
    group: "Audit",
  },
];

export const ROLE_DEFINITIONS = [
  {
    slug: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Full access to all admin hub features including user management",
    isSystem: true,
    permissions: Object.values(PERMISSIONS),
  },
  {
    slug: "MANAGER",
    name: "Manager",
    description: "Manage clients, partners, modules, and licenses",
    isSystem: true,
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.CLIENTS_READ,
      PERMISSIONS.CLIENTS_WRITE,
      PERMISSIONS.PARTNERS_READ,
      PERMISSIONS.PARTNERS_WRITE,
      PERMISSIONS.MODULES_READ,
      PERMISSIONS.MODULES_WRITE,
      PERMISSIONS.LICENSES_GENERATE,
      PERMISSIONS.LICENSES_REVOKE,
      PERMISSIONS.LICENSES_RENEW,
      PERMISSIONS.LICENSES_REBIND_HARDWARE,
      PERMISSIONS.INSTALLATIONS_READ,
      PERMISSIONS.INSTALLATIONS_WRITE,
    ],
  },
  {
    slug: "VIEWER",
    name: "Viewer",
    description: "Read-only access to dashboard data",
    isSystem: true,
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.CLIENTS_READ,
      PERMISSIONS.PARTNERS_READ,
      PERMISSIONS.MODULES_READ,
    ],
  },
] as const;

export const SUPER_ADMIN_ROLE_SLUG = "SUPER_ADMIN";

/** Legacy / human-friendly aliases accepted by verifyAccess(). */
export const PERMISSION_ALIASES = {
  "generate-licenses": PERMISSIONS.LICENSES_GENERATE,
  "manage-users": PERMISSIONS.USERS_WRITE,
} as const;

export function resolvePermissionSlug(slug: string): string {
  return (
    PERMISSION_ALIASES[slug as keyof typeof PERMISSION_ALIASES] ?? slug
  );
}

export function hasPermission(
  permissions: string[] | undefined,
  permission: PermissionSlug,
) {
  return permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(
  permissions: string[] | undefined,
  required: PermissionSlug[],
) {
  return required.some((permission) => hasPermission(permissions, permission));
}
