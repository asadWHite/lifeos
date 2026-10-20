import { createPublicKey, createVerify } from "node:crypto";

/* Server-side verification of Firebase ID tokens WITHOUT a service account.
 * Firebase ID tokens are RS256 JWTs signed by Google's securetoken service;
 * verification uses Google's public X.509 certificates (exactly what the
 * Admin SDK does), so no private keys ever touch this codebase. */

const CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getSigningCerts(): Promise<Record<string, string>> {
  if (certCache && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch(CERTS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not fetch Google's signing certificates");
  const maxAge = /max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "");
  const certs = (await res.json()) as Record<string, string>;
  certCache = { certs, expiresAt: Date.now() + (maxAge ? Number(maxAge[1]) : 3600) * 1000 };
  return certs;
}

export interface VerifiedFirebaseIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
}

function decodePart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

export async function verifyFirebaseIdToken(idToken: string, projectId: string): Promise<VerifiedFirebaseIdentity> {
  const segments = idToken.split(".");
  if (segments.length !== 3) throw new Error("Malformed token");
  const [h, p, sig] = segments;
  const header = decodePart<{ alg?: string; kid?: string }>(h);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported token header");

  const certs = await getSigningCerts();
  const cert = certs[header.kid];
  if (!cert) throw new Error("Unknown signing key");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${h}.${p}`);
  const key = createPublicKey(cert);
  if (!verifier.verify(key, Buffer.from(sig, "base64url"))) {
    throw new Error("Invalid token signature");
  }

  const claims = decodePart<{
    iss?: string; aud?: string; sub?: string; exp?: number; iat?: number;
    email?: string; email_verified?: boolean; name?: string; picture?: string;
  }>(p);

  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("Wrong token issuer");
  if (claims.aud !== projectId) throw new Error("Wrong token audience");
  if (typeof claims.exp !== "number" || claims.exp < now) throw new Error("Token expired");
  if (typeof claims.iat !== "number" || claims.iat > now + 300) throw new Error("Token issued in the future");
  if (!claims.sub) throw new Error("Token missing subject");
  if (!claims.email) throw new Error("Google account did not return an email address");

  return {
    uid: claims.sub,
    email: claims.email.toLowerCase(),
    emailVerified: claims.email_verified === true,
    name: typeof claims.name === "string" ? claims.name : "",
    picture: typeof claims.picture === "string" ? claims.picture : null,
  };
}
