/** Per-transaction migration cap (mirrors maxMigrationBatchSize). */
export const MIGRATION_CAP = 25;

/** All eligible token ids, clamped to the per-tx cap (the "migrate all" default). */
export function selectAllEligible(tokenIds: readonly bigint[], cap: number = MIGRATION_CAP): bigint[] {
  return tokenIds.slice(0, cap);
}

/** Trim a user selection to the per-tx cap. */
export function clampSelection(selected: readonly bigint[], cap: number = MIGRATION_CAP): bigint[] {
  return selected.slice(0, cap);
}

/** How many eligible punks remain after one capped wave (drives "Migrate remaining K"). */
export function remainingAfterWave(eligibleCount: number, cap: number = MIGRATION_CAP): number {
  return Math.max(0, eligibleCount - cap);
}
