import type { Address } from "viem";
import { stageConfig } from "@/lib/stage";

// Derived from the active stage. `legacy`/`current` are undefined when the
// stage has no migration target (content, or mainnet before deploy), so this
// module never throws at import. `migrationEnabled` gates the UI.
export const activeMigrationContracts: {
  chainId: number;
  legacy?: Address;
  current?: Address;
} = {
  chainId: stageConfig.chainId,
  legacy: stageConfig.legacy?.address,
  current: stageConfig.current?.address,
};

export const migrationEnabled = stageConfig.migrationEnabled;

// Measured at about 1.05M gas for 25 Sepolia migrations on 2026-05-26.
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
] as const;
