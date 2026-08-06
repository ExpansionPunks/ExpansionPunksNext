import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveStageConfig } from "./stage.ts";

const configuredSepolia = {
  NEXT_PUBLIC_SITE_STAGE: "testnet",
  NEXT_PUBLIC_SEPOLIA_LEGACY: "0x1111111111111111111111111111111111111111",
  NEXT_PUBLIC_SEPOLIA_CURRENT: "0x2222222222222222222222222222222222222222",
  NEXT_PUBLIC_SEPOLIA_REWARDS: "0x3333333333333333333333333333333333333333",
  NEXT_PUBLIC_SEPOLIA_RENDERER: "0x4444444444444444444444444444444444444444",
  NEXT_PUBLIC_SEPOLIA_FROM_BLOCK: "123456",
} satisfies NodeJS.ProcessEnv;

test("content is the safe default", () => {
  const config = resolveStageConfig({});

  assert.equal(config.stage, "content");
  assert.equal(config.walletEnabled, false);
  assert.equal(config.migrationEnabled, false);
});

test("testnet fails closed without a complete fresh deployment", () => {
  const config = resolveStageConfig({ NEXT_PUBLIC_SITE_STAGE: "testnet" });

  assert.equal(config.stage, "testnet");
  assert.equal(config.walletEnabled, false);
  assert.equal(config.migrationEnabled, false);
  assert.equal(config.legacy, undefined);
  assert.equal(config.current, undefined);
  assert.equal(config.rewards, undefined);
  assert.equal(config.renderer, undefined);
  assert.equal(config.rewardsMerkleUrl, undefined);
});

test("testnet opens only with all deployment coordinates", () => {
  const config = resolveStageConfig(configuredSepolia);

  assert.equal(config.walletEnabled, true);
  assert.equal(config.migrationEnabled, true);
  assert.equal(config.legacy?.address, configuredSepolia.NEXT_PUBLIC_SEPOLIA_LEGACY);
  assert.equal(config.current?.address, configuredSepolia.NEXT_PUBLIC_SEPOLIA_CURRENT);
  assert.equal(config.rewards, configuredSepolia.NEXT_PUBLIC_SEPOLIA_REWARDS);
  assert.equal(config.renderer, configuredSepolia.NEXT_PUBLIC_SEPOLIA_RENDERER);
  assert.equal(config.rewardsMerkleUrl, "/rewards/testnet-merkle.json");
});

test("an invalid testnet deployment block keeps the rehearsal closed", () => {
  const config = resolveStageConfig({
    ...configuredSepolia,
    NEXT_PUBLIC_SEPOLIA_FROM_BLOCK: "0",
  });

  assert.equal(config.walletEnabled, false);
  assert.equal(config.migrationEnabled, false);
});
