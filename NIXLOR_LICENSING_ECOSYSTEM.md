```markdown
# Nixlor Licensing Ecosystem: Technical Architecture & Integration Guide
**Version:** 2.0 (Enterprise-Ready)  
**Security Model:** Asymmetric Cryptography (RS256) + Offline-First Heartbeat Sync  
**Target Environment:** Central Cloud Hub (Vercel) & On-Premises Client Web Applications (LAN/Offline)

---

## 1. System Architecture Overview

The Nixlor Licensing Ecosystem operates on an asymmetric cryptographic trust model combined with an offline-first heartbeat sync mechanism.


```

+-----------------------------------------------------------------------------------+
|                            NIXLOR LICENSING ECOSYSTEM                             |
+-----------------------------------------------------------------------------------+
│
┌───────────────────────┴───────────────────────┐
▼                                               ▼
[ Central Cloud Admin Hub ]                     [ On-Premises Client App ]
• RS256 Private Key Signing                     • RS256 Public Key Verification
• Immutable Financial Ledger                    • Zero Internet Daily Operation
• Dynamic RBAC with Kill Switch                 • Hardware ID Binding
• Jittered Heartbeat API                        • 14-Day Offline Grace Timer

```

### Core Tenets
1. **Zero-Trust Token Generation:** Licenses are digitally signed on the central Vercel hub using an `RS256` Private Key (`2048-bit`). The private key never leaves the central server.
2. **Offline Local Verification:** On-premises installations only store the corresponding `RS256` Public Key. The local Node.js/Next.js runtime verifies expiration, module entitlement, and token authenticity entirely offline.
3. **Anti-Tamper & Anti-Cloning:** Local servers compute a hardware fingerprint (MAC/CPU/OS ID). The first heartbeat check locks the license string to that specific hardware footprint.
4. **Resilient Network Tolerance:** On-prem applications operate continuously without active internet connectivity. A 14-day rolling grace period syncs state whenever external internet connectivity is detected.

---

## 2. Production Database Schema (Prisma ORM)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum LicenseStatus {
  ACTIVE
  REVOKED
  EXPIRED
}

enum TransactionType {
  NEW_ISSUANCE
  RENEWAL
  UPGRADE
}

enum PartnerStatus {
  ACTIVE
  INACTIVE
}

model AdminRole {
  id          String           @id @default(cuid())
  slug        String           @unique
  name        String
  description String?
  isSystem    Boolean          @default(false)
  users       AdminUser[]
  permissions RolePermission[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@map("admin_roles")
}

model Permission {
  id          String           @id @default(cuid())
  slug        String           @unique
  name        String
  description String?
  group       String
  roles       RolePermission[]

  @@map("permissions")
}

model RolePermission {
  roleId       String
  permissionId String
  role         AdminRole  @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}

model AdminUser {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String?
  isActive     Boolean   @default(true)
  roleId       String
  role         AdminRole @relation(fields: [roleId], references: [id], onDelete: Restrict)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @default(now()) @updatedAt

  @@map("admin_users")
}

model AlliancePartner {
  id           String               @id @default(cuid())
  name         String               @unique
  contactEmail String
  phone        String?
  region       String
  status       PartnerStatus        @default(ACTIVE)
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt
  clients      Client[]
  transactions LicenseTransaction[]

  @@map("alliance_partners")
}

model SoftwareModule {
  id          String    @id @default(cuid())
  name        String    @unique
  description String?
  basePrice   Float     @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  licenses    License[]

  @@map("software_modules")
}

model Client {
  id                String           @id @default(cuid())
  businessName      String
  contactEmail      String
  phone             String?
  region            String?
  alliancePartnerId String?
  alliancePartner   AlliancePartner? @relation(fields: [alliancePartnerId], references: [id], onDelete: SetNull)
  createdAt         DateTime         @default(now())
  licenses          License[]

  @@map("clients")
}

model License {
  id               String               @id @default(cuid())
  clientId         String
  client           Client               @relation(fields: [clientId], references: [id], onDelete: Cascade)
  softwareModuleId String
  softwareModule   SoftwareModule       @relation(fields: [softwareModuleId], references: [id], onDelete: Restrict)
  status           LicenseStatus        @default(ACTIVE)
  hardwareId       String?
  latestTokenId    String?
  validFrom        DateTime             @default(now())
  expiresAt        DateTime
  lastHeartbeatAt  DateTime?
  transactions     LicenseTransaction[]

  @@unique([clientId, softwareModuleId])
  @@map("licenses")
}

model LicenseTransaction {
  id                String           @id @default(cuid())
  licenseId         String
  license           License          @relation(fields: [licenseId], references: [id], onDelete: Cascade)
  transactionType   TransactionType
  amountPaid        Float
  basePriceAtTime   Float
  commissionRate    Float?
  commissionAmount  Float?
  validFrom         DateTime
  validUntil        DateTime
  alliancePartnerId String?
  alliancePartner   AlliancePartner? @relation(fields: [alliancePartnerId], references: [id], onDelete: SetNull)
  createdAt         DateTime         @default(now())

  @@map("license_transactions")
}

```

---

## 3. Central Admin Panel API Specifications

### 3.1 License Generation

* **Endpoint:** `POST /api/licenses/generate`
* **Access Control:** Requires authenticated session with `licenses.generate` or `SUPER_ADMIN` permission.
* **Payload:**

```json
{
  "clientId": "cuid_client_123",
  "softwareModuleId": "cuid_module_vms",
  "durationInDays": 365,
  "amountPaid": 50000,
  "commissionRate": 20.0
}

```

* **Success Response (`200 OK`):**

```json
{
  "success": true,
  "licenseKey": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2027-08-16T07:19:08.000Z",
  "tokenId": "550e8400-e29b-41d4-a716-446655440000"
}

```

### 3.2 Client Heartbeat Check

* **Endpoint:** `POST /api/v1/heartbeat`
* **Access Control:** Public endpoint (Payload validated against active database records).
* **Headers Added by Server:** `Cache-Control: s-maxage=3600, stale-while-revalidate`
* **Payload:**

```json
{
  "clientId": "cuid_client_123",
  "module": "VMS",
  "hardwareId": "a1b2c3d4e5f6-cpu-signature"
}

```

* **Success Response (`200 OK`):**

```json
{
  "status": "ACTIVE",
  "expiresAt": "2027-08-16T07:19:08.000Z",
  "nextPingJitter": 7420
}

```

* **Error Response (`403 Forbidden`):**

```json
{
  "error": "HARDWARE_MISMATCH",
  "message": "Hardware footprint does not match registered instance."
}

```

---

## 4. Cursor SuperPrompt: On-Premises App Integration

Use this SuperPrompt in Cursor to integrate the Nixlor Licensing Agent into any on-premises web application (such as VMS, PMS, Ticketing, or Billing).

```text
System Context & Objective:
You are an expert full-stack engineer and software licensing architect. Your task is to integrate the official "Nixlor Offline-First Heartbeat Licensing Subsystem" into this existing on-premises Next.js / Node.js web application.

Prerequisites & Keys:
- An RSA-256 Public Key (stored at ./keys/nixlor_public.pem or via NIXLOR_PUBLIC_KEY env var)
- Environment Variables:
  - NIXLOR_CLIENT_ID: The unique Client ID string
  - NIXLOR_MODULE_NAME: The registered module name (e.g., "VMS", "PMS", "BILLING")
  - NIXLOR_LICENSE_KEY: The signed RS256 JWT string provided by Nixlor Hub
  - NIXLOR_HUB_URL: URL to the central admin hub (e.g., [https://admin.nixlor.com](https://admin.nixlor.com))

Requirements to Implement:

Step 1: Hardware Fingerprint Utility (lib/licensing/fingerprint.ts)
Create a deterministic hardware identifier generator using Node.js built-in `os` and `crypto` modules:
- Combine the primary MAC address, CPU model, architecture, and hostname.
- Generate a SHA-256 hash representation.
- Cache this ID in memory.

Step 2: Local License State Manager (lib/licensing/license-manager.ts)
Implement a singleton license manager that:
1. Loads and verifies the NIXLOR_LICENSE_KEY against the RSA Public Key using `jsonwebtoken` (RS256 algorithm).
2. Manages a local cache file (./license-state.json) containing:
   - `lastSuccessfulSync`: ISO timestamp
   - `hardwareId`: Current local hardware ID
   - `status`: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'HARDWARE_MISMATCH' | 'GRACE_PERIOD_EXCEEDED'
3. Enforces clock-tamper protection: Store `latestObservedTimestamp`. If current system time is earlier than this recorded timestamp, invalidate state.
4. Enforces a 14-Day Offline Grace Period: If offline time exceeds 14 days without a successful heartbeat sync, set status to 'GRACE_PERIOD_EXCEEDED'.

Step 3: Background Heartbeat Service (lib/licensing/heartbeat.ts)
Implement a background service executed at application startup:
1. Performs an immediate heartbeat check on boot-up.
2. Calls POST ${NIXLOR_HUB_URL}/api/v1/heartbeat with `{ clientId, module, hardwareId }`.
3. If successful: Update `lastSuccessfulSync`, adjust `status` to ACTIVE, and schedule the next check using `response.nextPingJitter` (defaulting to 24 hours + jitter).
4. If network request fails: Log a non-blocking warning and maintain offline operation under the grace period timer.
5. If hub returns 403 (HARDWARE_MISMATCH or REVOKED): Immediately update local state to locked.

Step 4: Request Interception Middleware (middleware.ts & API Guard)
1. Add an API/Route guard that intercepts all application requests except `/license-expired`, `/api/licensing/status`, and static assets.
2. If the local license state is not 'ACTIVE', return HTTP 403 with `{ error: 'LICENSE_RESTRICTED', reason: state.status }`.

Step 5: Frontend Lockout View (app/license-expired/page.tsx)
Build a responsive, branded lockout screen using Tailwind CSS:
- Display application locked status.
- Show detailed reason (Expired, Hardware Mismatch, or Grace Period Exceeded).
- Display Client ID and Module Name for easy support referencing.
- Provide a clear call to action: "Contact Nixlor Technologies or your authorized Alliance Partner for license renewal."
- Include an input box allowing an administrator to paste a newly issued `NIXLOR_LICENSE_KEY` directly from the browser to unlock the system without restarting the server process.

Execution Instructions:
Generate clean, production-ready TypeScript code across all specified files. Ensure all imports are resolved, no blocking operations occur on user web traffic, and file system writes are handled safely.

```

---

## 5. Client Deployment Verification Checklist

| Step | Verification Task | Expected Output |
| --- | --- | --- |
| **1** | Set environment variables in on-prem `.env` | `NIXLOR_CLIENT_ID`, `NIXLOR_LICENSE_KEY`, `NIXLOR_MODULE_NAME`, `NIXLOR_HUB_URL` populated |
| **2** | Place `nixlor_public.pem` in `/keys` directory | File permissions set to read-only (`chmod 400`) |
| **3** | Start application container | Boot logs confirm: `[Nixlor License] Signature Verified. Status: ACTIVE` |
| **4** | Test intentional network disconnection | System runs uninterrupted locally across LAN devices |
| **5** | Test date tampering | Server immediately flags time inversion and restricts access |

```

---

### Saving and Using the File

1. Copy the code block above.
2. Create a new file in your project or repository root named `NIXLOR_LICENSING_ECOSYSTEM.md`.
3. Paste the contents and save. You can view it in any Markdown reader, commit it to GitHub, or drop the included prompt directly into Cursor when configuring your on-premises apps.

<ElicitationsGroup message="What would you like to do next?">
<Elicitation label="Generate sample on-premises integration files" query="Generate sample on-premises integration files" query_intent="CLICKABLE_SUGGESTION" />
<Elicitation label="Create Docker Compose deployment template" query="Create Docker Compose deployment template" query_intent="CLICKABLE_SUGGESTION" />
<Elicitation label="Design automated license activation workflow" query="Design automated license activation workflow" query_intent="CLICKABLE_SUGGESTION" />
</ElicitationsGroup>

```