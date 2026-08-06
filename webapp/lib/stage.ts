import type { Address } from "viem";
import { mainnet, sepolia } from "wagmi/chains";

// One deploy stage drives chain, contracts, wallet, and migration availability.
export type SiteStage = "content" | "testnet" | "mainnet";

export type CollectionSource =
  | { strategy: "events"; address: Address; fromBlock: bigint; snapshotUrl?: string }
  | { strategy: "enumerable"; address: Address };

export type StageConfig = {
  stage: SiteStage;
  chainId: number;
  chainLabel: string;
  explorerBaseUrl: string;
  walletEnabled: boolean;
  migrationEnabled: boolean;
  legacy?: CollectionSource;
  current?: CollectionSource;
  rewards?: Address;
  rewardsMerkleUrl?: string;
  renderer?: Address;
};

const MAINNET_LEGACY: Address = "0x0d0167a823c6619d430b1a96ad85b888bcf97c37";

function readStage(env: NodeJS.ProcessEnv): SiteStage {
  const raw = env.NEXT_PUBLIC_SITE_STAGE;
  return raw === "testnet" || raw === "mainnet" ? raw : "content";
}

function normalizeAddress(value: string | undefined): Address | undefined {
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? (value as Address) : undefined;
}

function readBlock(value: string | undefined, fallback = BigInt(0)): bigint {
  if (!value) return fallback;
  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
}

function readPositiveBlock(value: string | undefined): bigint | undefined {
  const block = readBlock(value);
  return block > BigInt(0) ? block : undefined;
}

function readHttpsUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

export function resolveStageConfig(env: NodeJS.ProcessEnv = process.env): StageConfig {
  const stage = readStage(env);

  if (stage === "testnet") {
    const legacyAddress = normalizeAddress(env.NEXT_PUBLIC_SEPOLIA_LEGACY);
    const currentAddress = normalizeAddress(env.NEXT_PUBLIC_SEPOLIA_CURRENT);
    const rewards = normalizeAddress(env.NEXT_PUBLIC_SEPOLIA_REWARDS);
    const renderer = normalizeAddress(env.NEXT_PUBLIC_SEPOLIA_RENDERER);
    const fromBlock = readPositiveBlock(env.NEXT_PUBLIC_SEPOLIA_FROM_BLOCK);
    const rehearsalReady = Boolean(
      legacyAddress && currentAddress && rewards && renderer && fromBlock,
    );
    const legacy: CollectionSource | undefined = legacyAddress && fromBlock
      ? {
          strategy: "events",
          address: legacyAddress,
          fromBlock,
          snapshotUrl: "/inventory/sepolia.json",
        }
      : undefined;
    const current: CollectionSource | undefined = currentAddress && fromBlock
      ? {
          strategy: "events",
          address: currentAddress,
          fromBlock,
          snapshotUrl: "/inventory/sepolia.json",
        }
      : undefined;

    return {
      stage,
      chainId: sepolia.id,
      chainLabel: "Sepolia",
      explorerBaseUrl: "https://sepolia.etherscan.io",
      walletEnabled: rehearsalReady,
      migrationEnabled: rehearsalReady,
      legacy,
      current,
      rewards,
      rewardsMerkleUrl: rehearsalReady ? "/rewards/testnet-merkle.json" : undefined,
      renderer,
    };
  }
  if (stage === "mainnet") {
    const currentAddress = normalizeAddress(
      env.NEXT_PUBLIC_MAINNET_MIGRATION_ADDRESS,
    );
    const fromBlock = readPositiveBlock(env.NEXT_PUBLIC_MAINNET_FROM_BLOCK);
    const current: CollectionSource | undefined = currentAddress && fromBlock
      ? {
          strategy: "events",
          address: currentAddress,
          fromBlock,
        }
      : undefined;
    const rewards = normalizeAddress(env.NEXT_PUBLIC_MAINNET_REWARDS);
    const renderer = normalizeAddress(env.NEXT_PUBLIC_MAINNET_RENDERER_ADDRESS);
    const rewardsMerkleUrl = readHttpsUrl(env.NEXT_PUBLIC_MAINNET_MERKLE_URL);
    const rpcReady = Boolean(readHttpsUrl(env.NEXT_PUBLIC_MAINNET_RPC_URL));

    return {
      stage,
      chainId: mainnet.id,
      chainLabel: "Ethereum",
      explorerBaseUrl: "https://etherscan.io",
      walletEnabled: true,
      migrationEnabled: Boolean(current && rewards && renderer && rewardsMerkleUrl && rpcReady),
      legacy: { strategy: "enumerable", address: MAINNET_LEGACY },
      current,
      rewards,
      rewardsMerkleUrl,
      renderer,
    };
  }

  return {
    stage,
    chainId: mainnet.id,
    chainLabel: "Ethereum",
    explorerBaseUrl: "https://etherscan.io",
    walletEnabled: false,
    migrationEnabled: false,
  };
}

export const stageConfig: StageConfig = resolveStageConfig();
export const siteStage: SiteStage = stageConfig.stage;