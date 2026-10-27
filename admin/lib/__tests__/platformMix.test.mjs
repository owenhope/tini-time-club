import assert from "node:assert/strict";
import test from "node:test";

import {
  platformLabel,
  platformsByUser,
  summarizePlatformMix,
} from "../platformMix.mjs";

const row = (overrides) => ({
  installation_id: crypto.randomUUID(),
  audience: "member",
  user_id: "u1",
  platform: "ios",
  app_version: "4.9.0",
  last_seen_at: "2026-10-27T12:00:00Z",
  ...overrides,
});

test("counts members once per platform and visitors per installation", () => {
  const mix = summarizePlatformMix(
    [
      row({ user_id: "u1", platform: "ios" }),
      row({ user_id: "u1", platform: "ios" }),
      row({ user_id: "u1", platform: "android" }),
      row({ user_id: "u2", platform: "android" }),
      row({ audience: "visitor", user_id: null, platform: "android" }),
      row({ audience: "visitor", user_id: null, platform: "web" }),
    ],
    new Date("2026-10-01T00:00:00Z")
  );

  assert.deepEqual(mix.members, { ios: 1, android: 2, other: 0 });
  assert.deepEqual(mix.visitors, { ios: 0, android: 1, other: 1 });
});

test("ignores installations last seen before the window", () => {
  const mix = summarizePlatformMix(
    [row({ last_seen_at: "2026-09-01T00:00:00Z" })],
    new Date("2026-10-01T00:00:00Z")
  );
  assert.deepEqual(mix.members, { ios: 0, android: 0, other: 0 });
});

test("lists each member's platforms most recently seen first", () => {
  const platforms = platformsByUser([
    row({ platform: "ios", last_seen_at: "2026-10-01T00:00:00Z" }),
    row({
      platform: "android",
      app_version: "4.9.0",
      last_seen_at: "2026-10-27T00:00:00Z",
    }),
    row({ platform: "ios", last_seen_at: "2026-10-10T00:00:00Z" }),
    row({ audience: "visitor", user_id: null, platform: "web" }),
  ]);

  assert.deepEqual(
    platforms.get("u1")?.map((p) => [p.platform, p.lastSeenAt]),
    [
      ["android", "2026-10-27T00:00:00Z"],
      ["ios", "2026-10-10T00:00:00Z"],
    ]
  );
  assert.equal(platforms.size, 1);
});

test("labels platforms for display", () => {
  assert.equal(platformLabel("ios"), "iOS");
  assert.equal(platformLabel("android"), "Android");
  assert.equal(platformLabel("web"), "Web");
  assert.equal(platformLabel("something"), "Unknown");
});
