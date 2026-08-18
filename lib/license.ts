import jwt from "jsonwebtoken";

const DEFAULT_ISSUER = "nixlor-admin";
const DEFAULT_AUDIENCE = "nixlor-onprem";
const DEFAULT_KID = "nixlor-rsa-v1";

export function getPrivateKey(): string {
  const raw = process.env.LICENSE_RSA_PRIVATE_KEY;
  if (!raw) {
    throw new Error("LICENSE_RSA_PRIVATE_KEY is not configured");
  }
  return raw.replace(/\\n/g, "\n");
}

export function getSigningKeyId(): string {
  return process.env.LICENSE_RSA_KEY_ID ?? DEFAULT_KID;
}

export function signLicenseToken(params: {
  clientId: string;
  module: string;
  expiresAt: Date;
  jti: string;
  installationId: string;
  validFrom?: Date;
}): string {
  const privateKey = getPrivateKey();
  const exp = Math.floor(params.expiresAt.getTime() / 1000);
  const iat = Math.floor((params.validFrom ?? new Date()).getTime() / 1000);
  const kid = getSigningKeyId();

  return jwt.sign(
    {
      iss: DEFAULT_ISSUER,
      aud: DEFAULT_AUDIENCE,
      sub: params.clientId,
      clientId: params.clientId,
      module: params.module,
      installationId: params.installationId,
      iat,
      exp,
      licenseVersion: 1,
    },
    privateKey,
    {
      algorithm: "RS256",
      jwtid: params.jti,
      keyid: kid,
      header: { alg: "RS256", typ: "JWT", kid },
    },
  );
}

export function verifyLicenseToken(token: string, publicKey: string) {
  return jwt.verify(token, publicKey, {
    algorithms: ["RS256"],
    issuer: DEFAULT_ISSUER,
    audience: DEFAULT_AUDIENCE,
  });
}
