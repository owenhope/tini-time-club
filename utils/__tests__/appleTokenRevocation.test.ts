import { webcrypto } from "node:crypto";
import {
  createAppleClientSecret,
  exchangeAndRevokeAppleAuthorization,
} from "../../supabase/functions/delete-account/appleTokenRevocation";

const appleIdentityToken = (subject: string) => {
  const encoded = Buffer.from(JSON.stringify({ sub: subject })).toString(
    "base64url"
  );
  return `header.${encoded}.signature`;
};

const response = (
  body: Record<string, unknown>,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {}
) =>
  ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe("Sign in with Apple token revocation", () => {
  it("creates a short-lived ES256 Apple client secret", async () => {
    const keyPair = await webcrypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );
    const privateKeyBytes = new Uint8Array(
      await webcrypto.subtle.exportKey("pkcs8", keyPair.privateKey)
    );
    const privateKey = [
      "-----BEGIN PRIVATE KEY-----",
      Buffer.from(privateKeyBytes).toString("base64"),
      "-----END PRIVATE KEY-----",
    ].join("\n");

    const clientSecret = await createAppleClientSecret({
      clientId: "com.ohope.tinitimeclub",
      keyId: "APPLEKEY1",
      privateKey,
      teamId: "687P6W5CZU",
      webCrypto: webcrypto as unknown as Crypto,
    });
    const [encodedHeader, encodedPayload, encodedSignature] =
      clientSecret.split(".");
    const header = JSON.parse(
      Buffer.from(encodedHeader, "base64url").toString("utf8")
    );
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    );
    const validSignature = await webcrypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      keyPair.publicKey,
      Buffer.from(encodedSignature, "base64url"),
      Buffer.from(`${encodedHeader}.${encodedPayload}`)
    );

    expect(header).toEqual({ alg: "ES256", kid: "APPLEKEY1", typ: "JWT" });
    expect(payload).toMatchObject({
      iss: "687P6W5CZU",
      aud: "https://appleid.apple.com",
      sub: "com.ohope.tinitimeclub",
    });
    expect(payload.exp - payload.iat).toBe(5 * 60);
    expect(validSignature).toBe(true);
  });

  it("exchanges a fresh code and revokes the returned refresh token", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(
        response({
          id_token: appleIdentityToken("apple-user-id"),
          refresh_token: "apple-refresh-token",
        })
      )
      .mockResolvedValueOnce(response({}));

    await expect(
      exchangeAndRevokeAppleAuthorization({
        authorizationCode: "fresh-code",
        clientId: "com.ohope.tinitimeclub",
        clientSecret: "short-lived-client-secret",
        expectedSubject: "apple-user-id",
        fetcher,
      })
    ).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://appleid.apple.com/auth/token"
    );
    expect(fetcher.mock.calls[0][1].body).toContain("code=fresh-code");
    expect(fetcher.mock.calls[1][0]).toBe(
      "https://appleid.apple.com/auth/revoke"
    );
    expect(fetcher.mock.calls[1][1].body).toContain(
      "token=apple-refresh-token"
    );
    expect(fetcher.mock.calls[1][1].body).toContain(
      "token_type_hint=refresh_token"
    );
  });

  it("rejects an authorization issued for another Apple user", async () => {
    const fetcher = jest.fn().mockResolvedValue(
      response({
        id_token: appleIdentityToken("another-apple-user"),
        refresh_token: "apple-refresh-token",
      })
    );

    await expect(
      exchangeAndRevokeAppleAuthorization({
        authorizationCode: "fresh-code",
        clientId: "com.ohope.tinitimeclub",
        clientSecret: "short-lived-client-secret",
        expectedSubject: "apple-user-id",
        fetcher,
      })
    ).rejects.toThrow("Apple authorization does not belong to this account");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects an unrecognized bundle identifier before contacting Apple", async () => {
    const fetcher = jest.fn();

    await expect(
      exchangeAndRevokeAppleAuthorization({
        authorizationCode: "fresh-code",
        clientId: "com.example.untrusted",
        clientSecret: "short-lived-client-secret",
        expectedSubject: "apple-user-id",
        fetcher,
      })
    ).rejects.toThrow("Unsupported Sign in with Apple client");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
