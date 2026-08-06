export function migrateCtaLabel(count: number, cap: number): string {
  if (count > cap) return `Migrate up to ${cap} xPunks`;
  return `Migrate ${count} ${count === 1 ? "xPunk" : "xPunks"}`;
}
