# RSA Key Rotation (Future)

## Current Signing

- Algorithm: RS256 only
- Header includes `kid` (default: `nixlor-rsa-v1` via `LICENSE_RSA_KEY_ID`)
- Claims: `iss`, `aud`, `sub`, `clientId`, `module`, `installationId`, `jti`, `exp`, `iat`

## Rotation Procedure

1. Generate new RSA key pair
2. Set `LICENSE_RSA_KEY_ID=nixlor-rsa-v2` and update `LICENSE_RSA_PRIVATE_KEY`
3. Distribute **both** public keys to on-prem verifiers (v1 + v2)
4. New licenses sign with v2; existing JWTs remain valid until expiry
5. After all v1 licenses expire, retire v1 public key

## Never

- Rotate keys without distributing new public key to customers
- Invalidate existing JWTs mid-term without customer notice
