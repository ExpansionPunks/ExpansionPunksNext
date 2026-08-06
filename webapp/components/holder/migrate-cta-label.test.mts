import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateCtaLabel } from "./migrate-cta-label.ts";
import { MIGRATION_CAP } from "./migration-selection.ts";

test("singular label for one eligible xPunk", () => {
  assert.equal(migrateCtaLabel(1, MIGRATION_CAP), "Migrate 1 xPunk");
});

test("plural label for many eligible xPunks", () => {
  assert.equal(migrateCtaLabel(3, MIGRATION_CAP), "Migrate 3 xPunks");
});

test("communicates the transaction cap for larger wallets", () => {
  assert.equal(migrateCtaLabel(60, MIGRATION_CAP), "Migrate up to 25 xPunks");
});
