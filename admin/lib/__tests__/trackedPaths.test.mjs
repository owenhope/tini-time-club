import assert from "node:assert/strict";
import test from "node:test";
import { isTrackedPath } from "../trackedPaths.mjs";

test("public pages are tracked", () => {
  for (const path of ["/", "/about", "/r/42", "/p/7", "/business"]) {
    assert.equal(isTrackedPath(path), true, path);
  }
});

test("the dashboard and email links are never tracked", () => {
  for (const path of [
    "/admin",
    "/admin/users",
    "/email",
    "/email/unsubscribe",
  ]) {
    assert.equal(isTrackedPath(path), false, path);
  }
});

test("lookalike paths are not caught by the prefix match", () => {
  assert.equal(isTrackedPath("/administrator"), true);
  assert.equal(isTrackedPath("/emails-we-love"), true);
});

test("an unknown path is not tracked", () => {
  assert.equal(isTrackedPath(""), false);
  assert.equal(isTrackedPath(null), false);
});
