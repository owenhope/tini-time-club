import assert from "node:assert/strict";
import test from "node:test";
import {
  kilometersToMeters,
  metersToKilometers,
} from "../regionRadius.mjs";

test("catchment radius form conversion preserves 20 km", () => {
  assert.equal(kilometersToMeters(20), 20_000);
  assert.equal(metersToKilometers(20_000), 20);
});
