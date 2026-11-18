import { createPublicKey, verify as cryptoVerify, type JsonWebKey } from 'crypto';
import { env } from './env';

// Sign in with Apple: verifies the identity token (RS256 JWT) against
// Apple's published JWKS, then checks iss / aud / exp.
// https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/verifying_a_user

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const KEY_CACHE_MS = 60 * 60_000;

type AppleJwk = JsonWebKey & { kid: string; alg?: string };
let keyCache: { keys: AppleJwk[]; fetchedAt: number } | null = null;

export class AppleTokenError extends Error {}

async function appleKeys(force = false): Promise<AppleJwk[]> {
  if (!force && keyCache && Date.now() - keyCache.fetchedAt < KEY_CACHE_MS) return keyCache.keys;
  const res = await fetch(APPLE_KEYS_URL);
  if (!res.ok) throw new AppleTokenError(`Apple keys fetch failed: ${res.status}`);
  const body = (await res.json()) as { keys?: AppleJwk[] };
  keyCache = { keys: body.keys ?? [], fetchedAt: Date.now() };
  return keyCache.keys;
}

function decodePart<X>(part: string): X {
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as X;
  } catch {
    throw new AppleTokenError('Malformed identity token');
  }
}

export interface AppleIdentity {
  sub: string;
  email?: string;
  emailVerified: boolean;
}

export async function verifyAppleIdentityToken(token: string): Promise<AppleIdentity> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new AppleTokenError('Malformed identity token');
  const [h, p, sig] = parts;
  const header = decodePart<{ alg?: string; kid?: string }>(h);
  if (header.alg !== 'RS256' || !header.kid) throw new AppleTokenError('Unsupported token algorithm');

  let jwk = (await appleKeys()).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await appleKeys(true)).find((k) => k.kid === header.kid); // key rotation
  if (!jwk) throw new AppleTokenError('Unknown signing key');

  const ok = cryptoVerify(
    'RSA-SHA256',
    Buffer.from(`${h}.${p}`),
    createPublicKey({ key: jwk, format: 'jwk' }),
    Buffer.from(sig, 'base64url')
  );
  if (!ok) throw new AppleTokenError('Bad signature');

  const claims = decodePart<{
    iss?: string;
    aud?: string;
    exp?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
  }>(p);
  if (claims.iss !== APPLE_ISSUER) throw new AppleTokenError('Wrong issuer');
  if (!claims.exp || claims.exp * 1000 <= Date.now()) throw new AppleTokenError('Token expired');
  if (env.appleClientIds.length > 0) {
    if (!claims.aud || !env.appleClientIds.includes(claims.aud)) throw new AppleTokenError('Wrong audience');
  } else if (env.nodeEnv === 'production') {
    throw new AppleTokenError('APPLE_CLIENT_IDS is not configured');
  }
  if (!claims.sub) throw new AppleTokenError('Missing subject');
  return {
    sub: claims.sub,
    email: claims.email?.toLowerCase(),
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
  };
}
