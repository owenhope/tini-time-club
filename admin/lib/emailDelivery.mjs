import { emailPayload, resendFailure } from "./emailModel.mjs";

/**
 * @param {Parameters<typeof emailPayload>[0]} campaign
 * @param {Parameters<typeof emailPayload>[1]} recipient
 * @param {string} apiKey
 * @param {typeof fetch} request
 * @returns {Promise<{ok: true, providerId: string} | {ok: false, permanent: boolean, code: string, message: string}>}
 */
export async function deliverMemberEmail(
  campaign,
  recipient,
  apiKey,
  request = fetch
) {
  let response;
  try {
    response = await request("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `ttc-member-email/${recipient.id}`,
      },
      body: JSON.stringify(emailPayload(campaign, recipient)),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return {
      ok: false,
      permanent: false,
      code: "connection_interrupted",
      message:
        "Delivery response was interrupted. Wait five minutes, then resume this campaign; do not create a replacement.",
    };
  }
  if (!response.ok)
    return {
      ok: false,
      permanent:
        response.status < 500 &&
        ![401, 403, 409, 429].includes(response.status),
      code: `resend_${response.status}`,
      message: resendFailure(response.status),
    };
  const result = await response.json().catch(() => null);
  if (!result || typeof result.id !== "string" || !result.id)
    return {
      ok: false,
      permanent: false,
      code: "invalid_receipt",
      message:
        "Resend returned an incomplete receipt. Wait five minutes, then resume this campaign.",
    };
  return { ok: true, providerId: result.id };
}
