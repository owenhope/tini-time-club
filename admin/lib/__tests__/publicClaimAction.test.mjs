import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function harness(isBot = true) {
  const writes = [],
    emails = [];
  const compiled = ts.transpileModule(
    readFileSync(new URL("../publicClaimAction.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === "next/navigation")
        return {
          redirect: (path) => {
            throw new Error(path);
          },
        };
      if (name === "botid/server")
        return {
          checkBotId: async () => {
            if (isBot instanceof Error) throw isBot;
            return { isBot };
          },
        };
      if (name === "@/lib/operatorNotify.mjs")
        return { notifyOperator: async (...args) => emails.push(args) };
      if (name === "@/lib/supabaseAdmin")
        return {
          supabaseAdmin: () => ({
            rpc: async (...args) => {
              writes.push(args);
              return { data: { inquiryId: "test" }, error: null };
            },
          }),
        };
      return require(name);
    },
  });
  return { ...exports, writes, emails };
}
const inquiry = () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    contact_name: "Test sender",
    business_name: "Test business",
    business_email: "sender@example.com",
    message: "A business inquiry",
    website: "",
  }))
    form.set(key, value);
  return form;
};

test("automated inquiries with an empty honeypot never reach the queue or operator email", async () => {
  const h = harness(true);
  await assert.rejects(h.submitBusinessInquiry(inquiry()));
  assert.equal(h.writes.length, 0);
  assert.equal(h.emails.length, 0);
});

test("verified human inquiries can still be submitted", async () => {
  const h = harness(false);
  await assert.rejects(h.submitBusinessInquiry(inquiry()), /submitted=1/);
  assert.equal(h.writes.length, 1);
  assert.equal(h.emails.length, 1);
});

for (const action of ["submitBusinessInquiry", "submitPublicLocationClaim"]) {
  for (const verdict of [true, new Error("Verification unavailable")]) {
    test(`${action} blocks bots and verification outages before side effects (${verdict})`, async () => {
      const h = harness(verdict);
      const form = inquiry();
      form.set("location_id", "123");
      form.set("business_role", "Owner");
      form.set("explanation", "I own this business");
      await assert.rejects(h[action](form), /error=verification/);
      assert.equal(h.writes.length, 0);
      assert.equal(h.emails.length, 0);
    });
  }
  test(`${action} silently discards filled honeypots`, async () => {
    const h = harness(new Error("Should not need verification"));
    const form = inquiry();
    form.set("website", "spam.example");
    await assert.rejects(h[action](form), /submitted=1/);
    assert.equal(h.writes.length, 0);
    assert.equal(h.emails.length, 0);
  });
}
test("verified human claims reach the database", async () => {
  const h = harness(false);
  const form = inquiry();
  form.set("location_id", "123");
  form.set("business_role", "Owner");
  form.set("explanation", "I own this business");
  await assert.rejects(h.submitPublicLocationClaim(form), /submitted=1/);
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0][0], "submit_web_location_claim");
});
