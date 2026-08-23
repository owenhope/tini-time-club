import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("purple metric surfaces have a dark-mode background", () => {
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(css, /html\.dark \.admin-theme \.bg-violet-50\s*\{/);
});
