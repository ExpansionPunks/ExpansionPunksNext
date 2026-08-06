import { test } from "node:test";
import assert from "node:assert/strict";
import { phaseOf } from "./rewards-phase.ts";

const start = 1_000_000n, RW = 365n * 86400n, LW = 730n * 86400n;
const args = (now: bigint) => ({ start, rewardWindow: RW, latchWindow: LW, now });

test("before reward end → reward", () => {
  assert.equal(phaseOf(args(start + 1n)).phase, "reward");
});
test("at reward end → latch", () => {
  assert.equal(phaseOf(args(start + RW)).phase, "latch");
});
test("at latch end → terminal", () => {
  assert.equal(phaseOf(args(start + LW)).phase, "terminal");
});
