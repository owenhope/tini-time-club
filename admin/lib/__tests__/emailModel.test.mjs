import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_STORE_URL,
  emailPayload,
  validateEmailDraft,
  resendFailure,
} from "../emailModel.mjs";

const id = "70000000-0000-0000-0000-000000000001";
test("drafts validate audience, subject injection, length and member IDs", () => {
  const draft = {
    subject: " Hello ",
    body: " Message ",
    audience: "selected",
    ids: [id, id],
  };
  assert.deepEqual(validateEmailDraft(draft), {
    subject: "Hello",
    body: "Message",
    audience: "selected",
    ids: [id],
  });
  assert.throws(() => validateEmailDraft({ ...draft, ids: [] }));
  assert.throws(() => validateEmailDraft({ ...draft, ids: ["bad-id"] }));
  assert.throws(() =>
    validateEmailDraft({
      ...draft,
      subject: "Hello\r\nBcc: hidden@example.test",
    })
  );
  assert.throws(() =>
    validateEmailDraft({ ...draft, body: "a".repeat(20001) })
  );
  assert.throws(() => validateEmailDraft({ ...draft, audience: "everyone" }));
  for (const audience of ["all", "active", "inactive"]) {
    assert.equal(
      validateEmailDraft({ ...draft, audience, ids: [] }).audience,
      audience
    );
  }
});

test("messages isolate recipient addresses, escape HTML and carry stable unsubscribe links", () => {
  const campaign = {
    sender: "hello@example.test",
    subject: 'News <script>alert("x")</script>',
    body: '<img src=x onerror="alert(1)"> & hello',
    public_url: "https://example.test",
  };
  const payload = emailPayload(campaign, { id, email: "member@example.test" });
  assert.deepEqual(payload.to, ["member@example.test"]);
  assert.equal("cc" in payload, false);
  assert.equal("bcc" in payload, false);
  assert.ok(payload.html.includes("&lt;img"));
  assert.ok(!payload.html.includes("<img src=x"));
  assert.ok(payload.html.includes("News &lt;script&gt;"));
  assert.ok(!payload.html.includes("<script>"));
  assert.ok(payload.text.includes(campaign.body));
  assert.ok(payload.text.includes(`/email/unsubscribe?token=${id}`));
  assert.equal(
    payload.headers["List-Unsubscribe-Post"],
    "List-Unsubscribe=One-Click"
  );
  assert.ok(
    payload.headers["List-Unsubscribe"].includes(
      `/api/email/unsubscribe?token=${id}`
    )
  );
  assert.deepEqual(
    payload,
    emailPayload(campaign, { id, email: "member@example.test" })
  );
});

test("messages carry the brand header and App Store download link", () => {
  const campaign = {
    sender: "hello@example.test",
    subject: "News",
    body: "hello",
    public_url: "https://example.test",
  };
  const payload = emailPayload(campaign, { id, email: "member@example.test" });
  assert.ok(!payload.html.includes("<img"));
  assert.ok(payload.html.includes("tini time club."));
  assert.ok(payload.html.includes(`href="${APP_STORE_URL}"`));
  assert.ok(payload.html.includes("Download on the App Store"));
  assert.ok(payload.text.includes(APP_STORE_URL));
});

test("provider failures give actionable messages without exposing provider response data", () => {
  assert.match(resendFailure(429), /quota/);
  assert.match(resendFailure(403), /key permissions/);
  assert.match(resendFailure(500), /temporarily unavailable/);
});
