import { test } from "node:test";
import assert from "node:assert/strict";
import { activeStep, WIZARD_STEPS } from "./wizard-steps.ts";

test("steps are ordered select→approve→migrate→done", () => {
  assert.deepEqual([...WIZARD_STEPS], ["select", "approve", "migrate", "done"]);
});

test("no selection → select", () => {
  assert.equal(activeStep({ approved: false, selectedCount: 0, migrated: false }), "select");
});

test("selected but not approved → approve", () => {
  assert.equal(activeStep({ approved: false, selectedCount: 2, migrated: false }), "approve");
});

test("selected and approved → migrate", () => {
  assert.equal(activeStep({ approved: true, selectedCount: 2, migrated: false }), "migrate");
});

test("migrated → done regardless of other flags", () => {
  assert.equal(activeStep({ approved: true, selectedCount: 0, migrated: true }), "done");
});
