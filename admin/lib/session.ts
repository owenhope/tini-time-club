/**
 * Minimal signed-cookie session: the cookie value is `${expiresAt}.${hmac}`.
 * Web Crypto only, so verification also runs in edge middleware. One shared
 * admin credential (ADMIN_PASSWORD) is deliberate for now — a single-operator
 * tool; swap for Supabase Auth + an allowlist when there's a second admin.
 */

export const SESSION_COOKIE = "ttc-admin-session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// The signing key folds in ADMIN_PASSWORD, so rotating the password revokes
// every outstanding session cookie without a session store.
const getSecret = (): string => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be set");
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD must be set");
  return `${secret}\u0000${password}`;
};

/**
 * Constant-time string comparison. Both sides are hashed first so the loop
 * length never depends on the secret's length either.
 */
export const timingSafeEqual = async (
  a: string,
  b: string
): Promise<boolean> => {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const x = new Uint8Array(left);
  const y = new Uint8Array(right);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
};

const hmac = async (payload: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return Buffer.from(signature).toString("base64url");
};

export const createSessionToken = async (): Promise<{
  token: string;
  expiresAt: Date;
}> => {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const payload = String(expiresAt.getTime());
  return { token: `${payload}.${await hmac(payload)}`, expiresAt };
};

export const verifySessionToken = async (
  token: string | undefined
): Promise<boolean> => {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (Number(payload) < Date.now()) return false;
  return timingSafeEqual(await hmac(payload), signature);
};
