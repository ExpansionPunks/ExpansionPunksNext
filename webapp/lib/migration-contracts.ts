import type { Address } from "viem";
import { stageConfig } from "@/lib/stage";

export const activeMigrationContracts: {
  chainId: number;
  chainLabel: string;
  explorerBaseUrl: string;
  testnet: boolean;
  legacy?: Address;
  current?: Address;
  rewards?: Address;
} = {
  chainId: stageConfig.chainId,
  chainLabel: stageConfig.chainLabel,
  explorerBaseUrl: stageConfig.explorerBaseUrl,
  testnet: stageConfig.stage === "testnet",
  legacy: stageConfig.legacy?.address,
  current: stageConfig.current?.address,
  rewards: stageConfig.rewards,
};

export const migrationEnabled = stageConfig.migrationEnabled;

// Measured at 1,026,080 gas for 25 migrations with the real rewards hook.
export const maxMigrationBatchSize = 25;

export const legacyMigrationAbi = [
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isApprovedForAll",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setApprovalForAll",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const onchainMigrationAbi = [
  {
    type: "function",
    name: "isMigrated",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "migrate",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "migrateBatch",
    inputs: [{ name: "tokenIds", type: "uint256[]" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalMigrated",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },  {
    type: "function",
    name: "pendingRewardNotifications",
    inputs: [{ name: "migrator", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "retryRewards",
    inputs: [],
    outputs: [{ name: "notified", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Migrated",
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "RewardsNotificationDeferred",
    inputs: [
      { indexed: true, name: "migrator", type: "address" },
      { indexed: false, name: "count", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "RewardsNotificationRetried",
    inputs: [
      { indexed: true, name: "migrator", type: "address" },
      { indexed: false, name: "count", type: "uint256" },
    ],
  },
] as const;

export const rewardsDistributorAbi = [
  {
    type: "function",
    name: "basePerPunk",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "start",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "REWARD_WINDOW",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pending",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "migratedCount",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "participationClaimed",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdrawPending",
    inputs: [{ name: "to", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimParticipation",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "proof", type: "bytes32[]" },
      { name: "to", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "BaseRewardPaid",
    inputs: [
      { indexed: true, name: "migrator", type: "address" },
      { indexed: false, name: "count", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "BaseRewardPending",
    inputs: [
      { indexed: true, name: "migrator", type: "address" },
      { indexed: false, name: "count", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "LateMigration",
    inputs: [
      { indexed: true, name: "migrator", type: "address" },
      { indexed: false, name: "count", type: "uint256" },
    ],
  },
] as const;
