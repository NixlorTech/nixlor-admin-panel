import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { signLicenseToken, verifyLicenseToken } from "@/lib/license";
import { randomUUID } from "node:crypto";
import {
  applySchema,
  disconnectTestPrisma,
  ensureTestEnv,
  getTestDatabaseUrl,
} from "./setup";

const hasTestDb = Boolean(getTestDatabaseUrl());

describe("JWT RS256 validation", { skip: !hasTestDb }, () => {
  let publicKey: string;

  before(async () => {
    ensureTestEnv();
    applySchema();
    publicKey = process.env.LICENSE_RSA_PUBLIC_KEY!;
  });

  after(async () => {
    await disconnectTestPrisma();
  });

  it("signs token with RS256, kid, iss, aud, jti, installationId", () => {
    const expiresAt = new Date(Date.now() + 86_400_000);
    const jti = randomUUID();
    const token = signLicenseToken({
      clientId: "client-1",
      module: "VMS",
      expiresAt,
      jti,
      installationId: "inst-1",
    });

    const decoded = jwt.decode(token, { complete: true }) as {
      header: { alg: string; kid?: string };
      payload: Record<string, unknown>;
    };

    assert.equal(decoded.header.alg, "RS256");
    assert.ok(decoded.header.kid);
    assert.equal(decoded.payload.iss, "nixlor-admin");
    assert.equal(decoded.payload.aud, "nixlor-onprem");
    assert.equal(decoded.payload.jti, jti);
    assert.equal(decoded.payload.installationId, "inst-1");
    assert.equal(decoded.payload.module, "VMS");

    const verified = verifyLicenseToken(token, publicKey);
    assert.ok(verified);
  });

  it("rejects tampered payload", () => {
    const expiresAt = new Date(Date.now() + 86_400_000);
    const token = signLicenseToken({
      clientId: "client-1",
      module: "VMS",
      expiresAt,
      jti: randomUUID(),
      installationId: "inst-1",
    });

    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    payload.module = "HACKED";
    const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    assert.throws(() => verifyLicenseToken(tampered, publicKey));
  });

  it("rejects wrong public key", () => {
    const { publicKey: wrongKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const token = signLicenseToken({
      clientId: "client-1",
      module: "VMS",
      expiresAt: new Date(Date.now() + 86_400_000),
      jti: randomUUID(),
      installationId: "inst-1",
    });

    assert.throws(() =>
      verifyLicenseToken(
        token,
        wrongKey.export({ type: "spki", format: "pem" }).toString(),
      ),
    );
  });

  it("rejects expired token", () => {
    const token = signLicenseToken({
      clientId: "client-1",
      module: "VMS",
      expiresAt: new Date(Date.now() - 1000),
      jti: randomUUID(),
      installationId: "inst-1",
    });

    assert.throws(() => verifyLicenseToken(token, publicKey));
  });
});
