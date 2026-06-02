import type { Address } from "viem";
import { mainnet, sepolia } from "wagmi/chains";

// Single source of truth for the deploy stage. One env var drives everything:
//   NEXT_PUBLIC_SITE_STAGE = content | testnet | mainnet   (default: content)
// Downstream config (chain, contracts, walletEnabled, migrationEnabled) is
// derived here so no contradictory combination is representable.

export type SiteStage = "content" | "testnet" | "mainnet";

export type CollectionSource =
  | { strategy: "events"; address: Address; fromBlock: bigint }
  | { strategy: "enumerable"; address: Address };

export type StageConfig = {
  stage: SiteStage;
  chainId: number;
  chainLabel: string;
  walletEnabled: boolean;
  migrationEnabled: boolean;
  legacy?: CollectionSource;
  current?: CollectionSource;
};

// Fixed, public contract addresses (not secrets, rarely change).
const SEPOLIA_LEGACY: Address = "0x6C00D23a03Fe18e873963f4DCCFD48cAcCbA9Fd7";
const SEPOLIA_CURRENT: Address = "0x2Fa51d5760192D367ef77699a01e0e780B918567";
const SEPOLIA_FROM_BLOCK = BigInt(10893048);
const MAINNET_LEGACY: Address = "0x0d0167a823c6619d430b1a96ad85b888bcf97c37";

function readStage(): SiteStage {
  const raw = process.env.NEXT_PUBLIC_SITE_STAGE;
  return raw === "testnet" || raw === "mainnet" ? raw : "content";
}

function normalizeAddress(value: string | undefined): Address | undefined {
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? (value as Address) : undefined;
}

function readMainnetFromBlock(): bigint {
  const raw = process.env.NEXT_PUBLIC_MAINNET_FROM_BLOCK;
  if (!raw) return BigInt(0);
  try {
    return BigInt(raw);
  } catch {
    return BigInt(0);
  }
}

function resolveStageConfig(): StageConfig {
  const stage = readStage();

  if (stage === "testnet") {
    return {
      stage,
      chainId: sepolia.id,
      chainLabel: "Sepolia",
      walletEnabled: true,
      migrationEnabled: true,
      legacy: { strategy: "events", address: SEPOLIA_LEGACY, fromBlock: SEPOLIA_FROM_BLOCK },
      current: { strategy: "events", address: SEPOLIA_CURRENT, fromBlock: SEPOLIA_FROM_BLOCK },
    };
  }

  if (stage === "mainnet") {
    const currentAddress = normalizeAddress(process.env.NEXT_PUBLIC_MAINNET_MIGRATION_ADDRESS);
    const current: CollectionSource | undefined = currentAddress
      ? { strategy: "events", address: currentAddress, fromBlock: readMainnetFromBlock() }
      : undefined;

    return {
      stage,
      chainId: mainnet.id,
      chainLabel: "Ethereum",
      walletEnabled: true,
      // Stays gated until a real mainnet migration contract is configured.
      migrationEnabled: Boolean(current),
      legacy: { strategy: "enumerable", address: MAINNET_LEGACY },
      current,
    };
  }

  // content: narrative-only public site, no wallet or contracts.
  return {
    stage,
    chainId: mainnet.id,
    chainLabel: "Ethereum",
    walletEnabled: false,
    migrationEnabled: false,
  };
}

export const stageConfig: StageConfig = resolveStageConfig();
export const siteStage: SiteStage = stageConfig.stage;
