import { type LicenseRecord } from "@/lib/domain-types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type ClientLicenseStatus = "active" | "revoked" | "expiring";

export function getClientLicenseStatus(
  licenses: LicenseRecord[],
): ClientLicenseStatus {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + THIRTY_DAYS_MS);

  if (licenses.some((license) => license.status === "REVOKED")) {
    return "revoked";
  }

  const hasActive = licenses.some(
    (license) =>
      license.status === "ACTIVE" && new Date(license.expiresAt) > now,
  );

  if (!hasActive) {
    return "revoked";
  }

  const hasExpiringSoon = licenses.some(
    (license) =>
      license.status === "ACTIVE" &&
      new Date(license.expiresAt) > now &&
      new Date(license.expiresAt) <= thirtyDaysFromNow,
  );

  if (hasExpiringSoon) {
    return "expiring";
  }

  return "active";
}

export function getActiveModules(licenses: LicenseRecord[]): string[] {
  const now = new Date();
  return licenses
    .filter(
      (license) =>
        license.status === "ACTIVE" && new Date(license.expiresAt) > now,
    )
    .map((license) => license.moduleName);
}
