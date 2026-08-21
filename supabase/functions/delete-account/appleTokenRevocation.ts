const APPLE_TOKEN_ENDPOINT = "https://appleid.apple.com/auth/token";
const APPLE_REVOKE_ENDPOINT = "https://appleid.apple.com/auth/revoke";

export const ALLOWED_APPLE_CLIENT_IDS = new Set([
  "com.ohope.tinitimeclub",
  "com.ohope.tinitimeclub.preview",
  "com.ohope.tinitimeclub.dev",
]);

type AppleTokenResponse = {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
};

type Fetcher = typeof fetch;

const encodeBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize)
    );
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const encodeJson = (value: unknown): string =>
  encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)));

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Apple returned an invalid identity token");

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (character) =>
    character.charCodeAt(0)
  );
  const decoded = JSON.parse(new TextDecoder().decode(bytes));

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Apple returned an invalid identity token");
  }

  return decoded as Record<string, unknown>;
};

const privateKeyBytes = (privateKey: string): Uint8Array => {
  const normalized = privateKey.replace(/\\n/g, "\n");
  const encoded = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  if (!encoded) throw new Error("APPLE_PRIVATE_KEY is invalid");

  return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
};

export async function createAppleClientSecret({
  clientId,
  keyId,
  privateKey,
  teamId,
  webCrypto = crypto,
}: {
  clientId: string;
  keyId: string;
  privateKey: string;
  teamId: string;
  webCrypto?: Crypto;
}): Promise<string> {
  if (!ALLOWED_APPLE_CLIENT_IDS.has(clientId)) {
    throw new Error("Unsupported Sign in with Apple client");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: "ES256", kid: keyId, typ: "JWT" });
  const payload = encodeJson({
    iss: teamId,
    iat: now,
    exp: now + 5 * 60,
    aud: "https://appleid.apple.com",
    sub: clientId,
  });
  const signingInput = `${header}.${payload}`;
  const keyBytes = privateKeyBytes(privateKey);
  const keyBuffer = keyBytes.buffer.slice(
    keyBytes.byteOffset,
    keyBytes.byteOffset + keyBytes.byteLength
  ) as ArrayBuffer;
  const signingKey = await webCrypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(
    await webCrypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      signingKey,
      new TextEncoder().encode(signingInput)
    )
  );

  return `${signingInput}.${encodeBase64Url(signature)}`;
}

const jsonBody = async (
  response: Response
): Promise<Record<string, unknown>> => {
  try {
    const body = await response.json();
    return typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

export async function exchangeAndRevokeAppleAuthorization({
  authorizationCode,
  clientId,
  clientSecret,
  expectedSubject,
  fetcher = fetch,
}: {
  authorizationCode: string;
  clientId: string;
  clientSecret: string;
  expectedSubject: string;
  fetcher?: Fetcher;
}): Promise<void> {
  if (!ALLOWED_APPLE_CLIENT_IDS.has(clientId)) {
    throw new Error("Unsupported Sign in with Apple client");
  }

  const tokenResponse = await fetcher(APPLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: "authorization_code",
    }).toString(),
  });
  const tokenBody = (await jsonBody(tokenResponse)) as AppleTokenResponse;

  if (!tokenResponse.ok) {
    throw new Error(`Apple token exchange failed (${tokenResponse.status})`);
  }

  if (!tokenBody.id_token) {
    throw new Error("Apple token exchange returned no identity token");
  }

  const subject = decodeJwtPayload(tokenBody.id_token).sub;
  if (subject !== expectedSubject) {
    throw new Error("Apple authorization does not belong to this account");
  }

  const token = tokenBody.refresh_token ?? tokenBody.access_token;
  const tokenTypeHint = tokenBody.refresh_token
    ? "refresh_token"
    : "access_token";

  if (!token) {
    throw new Error("Apple token exchange returned no revocable token");
  }

  const revokeResponse = await fetcher(APPLE_REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token,
      token_type_hint: tokenTypeHint,
    }).toString(),
  });

  if (!revokeResponse.ok) {
    throw new Error(`Apple token revocation failed (${revokeResponse.status})`);
  }
}
