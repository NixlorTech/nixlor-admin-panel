import jwt from "jsonwebtoken";

export function getPrivateKey(): string {
  const raw = process.env.LICENSE_RSA_PRIVATE_KEY;
  if (!raw) {
    throw new Error("LICENSE_RSA_PRIVATE_KEY is not configured");
  }
  return raw.replace(/\\n/g, "\n");
}

export function signLicenseToken(params: {
  clientId: string;
  module: string;
  expiresAt: Date;
  jti: string;
}): string {
  const privateKey = getPrivateKey();
  const exp = Math.floor(params.expiresAt.getTime() / 1000);

  return jwt.sign(
    {
      clientId: params.clientId,
      module: params.module,
      jti: params.jti,
      exp,
    },
    privateKey,
    { algorithm: "RS256", jwtid: params.jti },
  );
}
