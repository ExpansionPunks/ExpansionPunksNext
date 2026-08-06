import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIGRATION_CAP,
  selectAllEligible,
  clampSelection,
  remainingAfterWave,
} from "./migration-selection.ts";

const ids = (n: number) => Array.from({ length: n }, (_, i) => BigInt(10000 + i));

test("cap is 25", () => {
  assert.equal(MIGRATION_CAP, 25);
});

test("selectAllEligible returns all when under cap", () => {
  assert.deepEqual(selectAllEligible(ids(3)), ids(3));
});

test("selectAllEligible clamps to cap (default 25)", () => {
  assert.equal(selectAllEligible(ids(40)).length, 25);
  assert.deepEqual(selectAllEligible(ids(40)), ids(25));
});

test("clampSelection trims an over-cap selection", () => {
  assert.equal(clampSelection(ids(30)).length, 25);
});

test("remainingAfterWave reports the leftover beyond the cap", () => {
  assert.equal(remainingAfterWave(3), 0);
  assert.equal(remainingAfterWave(40), 15);
  assert.equal(remainingAfterWave(25), 0);
});
