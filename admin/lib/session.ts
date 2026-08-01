/**
 * Minimal signed-cookie session: the cookie value is `${expiresAt}.${hmac}`.
 * Web Crypto only, so verification also runs in edge middleware. One shared
 * admin credential (ADMIN_PASSWORD) is deliberate for now — a single-operator
 * tool; swap for Supabase Auth + an allowlist when there's a second admin.
 */

export const SESSION_COOKIE = "ttc-admin-session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const getSecret = (): string => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be set");
  return secret;
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
  return (await hmac(payload)) === signature;
};
