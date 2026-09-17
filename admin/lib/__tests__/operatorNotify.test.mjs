import test from "node:test";
import assert from "node:assert/strict";
import { notifyOperator } from "../operatorNotify.mjs";

const options = {
  apiKey: "key",
  from: "hello@tinitimeclub.com",
  to: "operator@example.test",
};

test("sends a plain-text notification to the operator", async () => {
  let captured;
  const ok = await notifyOperator(
    "New business inquiry: The Test Lounge",
    ["Line one", "", "Line two"],
    {
      ...options,
      request: async (url, init) => {
        captured = { url, init };
        return { ok: true };
      },
    }
  );

  assert.equal(ok, true);
  assert.equal(captured.url, "https://api.resend.com/emails");
  const body = JSON.parse(captured.init.body);
  assert.equal(body.from, "Tini Time Club <hello@tinitimeclub.com>");
  assert.deepEqual(body.to, ["operator@example.test"]);
  assert.equal(body.subject, "New business inquiry: The Test Lounge");
  assert.equal(body.text, "Line one\n\nLine two");
  assert.equal(body.html, undefined);
});

test("does nothing without delivery configuration", async () => {
  const ok = await notifyOperator("Subject", ["Body"], {
    apiKey: "",
    from: "",
    to: "",
    request: async () => {
      throw new Error("should not be called");
    },
  });
  assert.equal(ok, false);
});

test("swallows transport failures so submissions never break", async () => {
  const ok = await notifyOperator("Subject", ["Body"], {
    ...options,
    request: async () => {
      throw new Error("network down");
    },
  });
  assert.equal(ok, false);
});

test("falls back to the sender address as recipient", async () => {
  let captured;
  await notifyOperator("Subject", ["Body"], {
    apiKey: "key",
    from: "hello@tinitimeclub.com",
    to: undefined,
    request: async (url, init) => {
      captured = JSON.parse(init.body);
      return { ok: true };
    },
  });
  assert.deepEqual(captured.to, ["hello@tinitimeclub.com"]);
});
