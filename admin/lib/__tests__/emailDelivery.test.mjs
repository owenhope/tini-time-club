import assert from "node:assert/strict";
import test from "node:test";
import { deliverMemberEmail } from "../emailDelivery.mjs";

const campaign = {
  subject: "Test",
  body: "Hello",
  sender: "hello@example.test",
  public_url: "https://example.test",
};
const recipient = {
  id: "70000000-0000-0000-0000-000000000001",
  email: "member@example.test",
};

test("delivery retries use the identical key and payload and return the provider receipt", async () => {
  const requests = [];
  const request = async (url, options) => {
    requests.push({ url, ...options });
    return Response.json({ id: "receipt" });
  };
  assert.deepEqual(
    await deliverMemberEmail(campaign, recipient, "test-key", request),
    { ok: true, providerId: "receipt" }
  );
  await deliverMemberEmail(campaign, recipient, "test-key", request);
  assert.equal(requests[0].url, "https://api.resend.com/emails");
  assert.equal(requests[0].method, "POST");
  assert.equal(
    requests[0].headers["Idempotency-Key"],
    requests[1].headers["Idempotency-Key"]
  );
  assert.equal(requests[0].body, requests[1].body);
  assert.deepEqual(JSON.parse(requests[0].body).to, [recipient.email]);
});

test("network failures, malformed receipts, and rate limits remain retryable", async () => {
  const failure = await deliverMemberEmail(
    campaign,
    recipient,
    "test-key",
    async () => {
      throw new Error("sensitive upstream data");
    }
  );
  assert.equal(failure.permanent, false);
  assert.ok(!failure.message.includes("sensitive"));
  for (const status of [401, 403, 409, 429, 500, 503]) {
    const result = await deliverMemberEmail(
      campaign,
      recipient,
      "test-key",
      async () =>
        Response.json({ message: "private upstream data" }, { status })
    );
    assert.equal(result.ok, false);
    assert.equal(result.permanent, false);
    assert.ok(!result.message.includes("private"));
  }
  const malformed = await deliverMemberEmail(
    campaign,
    recipient,
    "test-key",
    async () => Response.json({})
  );
  assert.equal(malformed.code, "invalid_receipt");
  assert.equal(malformed.permanent, false);
});

test("invalid recipient responses are permanent failures", async () => {
  const result = await deliverMemberEmail(
    campaign,
    recipient,
    "test-key",
    async () => Response.json({}, { status: 422 })
  );
  assert.equal(result.permanent, true);
  assert.equal(result.code, "resend_422");
});
