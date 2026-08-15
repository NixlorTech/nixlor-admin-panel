export const LICENSE_STATUSES = ["ACTIVE", "REVOKED", "EXPIRED"] as const;

export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

export const TRANSACTION_TYPES = [
  "NEW_ISSUANCE",
  "RENEWAL",
  "UPGRADE",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PARTNER_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export type SoftwareModuleRecord = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  createdAt: string;
  updatedAt: string;
};

export type AlliancePartnerRecord = {
  id: string;
  name: string;
  contactEmail: string;
  phone: string | null;
  region: string;
  status: PartnerStatus;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
};

export type LicenseTransactionRecord = {
  id: string;
  licenseId: string;
  moduleName: string;
  transactionType: TransactionType;
  amountPaid: number;
  basePriceAtTime: number;
  alliancePartnerId: string | null;
  alliancePartnerName: string | null;
  validFrom: string;
  validUntil: string;
  createdAt: string;
};

export type LicenseRecord = {
  id: string;
  clientId: string;
  softwareModuleId: string;
  moduleName: string;
  status: LicenseStatus;
  validFrom: string;
  expiresAt: string;
  lastHeartbeatAt: string | null;
  transactions: LicenseTransactionRecord[];
};

export type ClientRecord = {
  id: string;
  businessName: string;
  contactEmail: string;
  phone: string | null;
  region: string | null;
  alliancePartnerId: string | null;
  alliancePartnerName: string | null;
  createdAt: string;
  licenses: LicenseRecord[];
};
