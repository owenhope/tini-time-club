import assert from "node:assert/strict";
import test from "node:test";

import { resolveLiveActivityResponse } from "../liveActivity.mjs";

test("keeps Live available as a graceful rollout when the event table is missing", () => {
  assert.deepEqual(
    resolveLiveActivityResponse(null, {
      code: "PGRST205",
      message: "Could not find the table public.app_analytics_events",
    }),
    { available: false, events: [] }
  );
});

test("maps event presentation without exposing installation or session IDs", () => {
  const result = resolveLiveActivityResponse(
    [
      {
        id: "event-1",
        event_name: "like_review",
        user_id: "user-1",
        platform: "ios",
        app_version: "4.0.2",
        app_environment: "production",
        occurred_at: "2026-08-22T18:00:00Z",
        installation_id: "must-not-leak",
        session_id: "must-not-leak",
      },
    ],
    null,
    [{ id: "user-1", username: "olive", name: "Olive" }]
  );

  assert.deepEqual(result, {
    available: true,
    events: [
      {
        id: "event-1",
        occurredAt: "2026-08-22T18:00:00Z",
        action: "Liked a review",
        category: "Social",
        tone: "purple",
        actorId: "user-1",
        actor: "@olive",
        platform: "ios",
        appVersion: "4.0.2",
        appEnvironment: "production",
      },
    ],
  });
  assert.equal("installationId" in result.events[0], false);
  assert.equal("sessionId" in result.events[0], false);
});
