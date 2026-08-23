import assert from "node:assert/strict";
import test from "node:test";

import { resolveProductTelemetryResponse } from "../productTelemetry.mjs";

test("keeps the dashboard available while product telemetry is undeployed", () => {
  assert.equal(
    resolveProductTelemetryResponse(null, {
      code: "PGRST202",
      message: "function missing",
    }).available,
    false
  );
});

test("does not hide unrelated product telemetry failures", () => {
  assert.throws(
    () =>
      resolveProductTelemetryResponse(null, {
        code: "50000",
        message: "database unavailable",
      }),
    /Unable to load product telemetry: database unavailable/
  );
});

test("maps versions, D7 retention, and auth-health rates", () => {
  assert.deepEqual(
    resolveProductTelemetryResponse(
      {
        versions: [
          { version: "4.0.2", installations: 8 },
          { version: "4.0.1", installations: 2 },
        ],
        retention: { eligibleInstallations: 5, returnedInstallations: 3 },
        authHealth: {
          unexpectedSignOuts: 2,
          sessionMissingAtLaunch: 1,
          affectedInstallations: 1,
        },
      },
      null
    ),
    {
      available: true,
      trackedInstallations: 10,
      versions: [
        { version: "4.0.2", installations: 8, share: 80 },
        { version: "4.0.1", installations: 2, share: 20 },
      ],
      retention: {
        eligibleInstallations: 5,
        returnedInstallations: 3,
        rate: 60,
      },
      authHealth: {
        unexpectedSignOuts: 2,
        sessionMissingAtLaunch: 1,
        affectedInstallations: 1,
        issueRate: 10,
      },
    }
  );
});
