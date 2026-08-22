import assert from "node:assert/strict";
import test from "node:test";

import { resolveAudienceUsageResponse } from "../audienceUsage.mjs";

test("marks app audience unavailable while its RPC is not deployed", () => {
  const result = resolveAudienceUsageResponse(null, {
    code: "PGRST202",
    message:
      "Could not find the function public.get_app_usage_summary(p_active_since, p_since, p_until) in the schema cache",
  });

  assert.deepEqual(result, {
    available: false,
    visitorActiveNow: 0,
    memberActiveNow: 0,
    visitorInRange: 0,
    memberInRange: 0,
    convertedInRange: 0,
    visitorByDay: [],
    memberByDay: [],
  });
});

test("does not hide unexpected audience data failures", () => {
  assert.throws(
    () =>
      resolveAudienceUsageResponse(null, {
        code: "50000",
        message: "database unavailable",
      }),
    /Unable to load app audience: database unavailable/
  );
});

test("maps an available audience summary", () => {
  const result = resolveAudienceUsageResponse(
    {
      visitorActiveNow: 2,
      memberActiveNow: 3,
      visitorInRange: 4,
      memberInRange: 5,
      convertedInRange: 1,
      byDay: [{ day: "2026-08-20", visitors: 4, members: 5 }],
    },
    null
  );

  assert.deepEqual(result, {
    available: true,
    visitorActiveNow: 2,
    memberActiveNow: 3,
    visitorInRange: 4,
    memberInRange: 5,
    convertedInRange: 1,
    visitorByDay: [{ day: "2026-08-20", count: 4 }],
    memberByDay: [{ day: "2026-08-20", count: 5 }],
  });
});
