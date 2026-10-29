import assert from "node:assert/strict";
import test from "node:test";
import { adminActionFeedback } from "../adminActionFeedback.mjs";

test("validation failures override stale success flags", () => {
  const notice = adminActionFeedback(
    new URLSearchParams("updated=1&error=reason")
  );
  assert.equal(notice.kind, "error");
  assert.match(notice.message, /reason/);
});
test("partial region saves are never reported as full success", () => {
  for (const flag of ["refresh=failed", "eligibility=blocked"]) {
    const notice = adminActionFeedback(
      new URLSearchParams("updated=1&" + flag)
    );
    assert.equal(notice.kind, "error");
    assert.match(notice.message, /saved, but/);
  }
});
test("successful outcomes include save, moderation, refresh and notification queueing", () => {
  for (const query of [
    "updated=1",
    "updated=approved",
    "updated=manager-removed",
    "refreshed=1",
    "sent=5",
  ]) {
    assert.equal(
      adminActionFeedback(new URLSearchParams(query)).kind,
      "success"
    );
  }
  assert.match(
    adminActionFeedback(new URLSearchParams("sent=5")).message,
    /queued/
  );
});
test("unknown errors stay safe and ordinary navigation has no success message", () => {
  assert.equal(
    adminActionFeedback(
      new URLSearchParams("error=private-database-details")
    ).message.includes("private-database"),
    false
  );
  assert.equal(adminActionFeedback(new URLSearchParams("q=test")), null);
  assert.equal(adminActionFeedback(new URLSearchParams("sent=0")), null);
});

import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function formHarness(action) {
  const events = [];
  const frameworkError = new Error("Framework redirect");
  const exports = {};
  const source = ts.transpileModule(
    readFileSync(
      new URL("../../components/AdminActionForm.tsx", import.meta.url),
      "utf8"
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }
  ).outputText;
  vm.runInNewContext(source, {
    exports,
    URL,
    CustomEvent: class {
      constructor(type, { detail }) {
        this.type = type;
        this.detail = detail;
      }
    },
    window: {
      location: {
        href: "https://example.com/admin/inquiries?updated=1&status=new",
      },
      history: {
        replaceState(_state, _unused, url) {
          assert.equal(url.searchParams.get("updated"), null);
          assert.equal(url.searchParams.get("status"), "new");
        },
      },
      dispatchEvent(event) {
        events.push(event.detail);
      },
    },
    require(name) {
      if (name === "react/jsx-runtime") return { jsx: (_type, props) => props };
      if (name === "next/navigation")
        return {
          unstable_rethrow(error) {
            if (error === frameworkError) throw error;
          },
        };
      throw new Error(name);
    },
  });
  return {
    submit: exports.default({ action: () => action(frameworkError) }).action,
    events,
    frameworkError,
  };
}
test("resolved actions announce success only after completion", async () => {
  let complete;
  const h = formHarness(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      })
  );
  const pending = h.submit(new FormData());
  assert.deepEqual(h.events, [null]);
  complete();
  await pending;
  assert.equal(h.events[1].kind, "success");
});
test("failed actions show a safe error rather than success", async () => {
  const h = formHarness(async () => {
    throw new Error("Private database details");
  });
  await h.submit(new FormData());
  assert.equal(h.events[1].kind, "error");
  assert.equal(h.events[1].message.includes("Private"), false);
});
test("redirects retain Next navigation behavior without a false success", async () => {
  const h = formHarness(async (error) => {
    throw error;
  });
  await assert.rejects(
    h.submit(new FormData()),
    (error) => error === h.frameworkError
  );
  assert.deepEqual(h.events, [null]);
});

test("query parameter prototype names remain plain feedback text", () => {
  for (const query of ["error=__proto__", "updated=constructor"]) {
    assert.equal(
      typeof adminActionFeedback(new URLSearchParams(query)).message,
      "string"
    );
  }
});
