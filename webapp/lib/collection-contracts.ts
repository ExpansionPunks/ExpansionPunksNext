import { type CollectionSource, stageConfig } from "@/lib/stage";

// Inventory sources are derived from the active stage (see lib/stage.ts).
export type InventoryCollection = CollectionSource;

export type InventoryDeployment = {
  label: string;
  legacy?: InventoryCollection;
  current?: InventoryCollection;
  testnet: boolean;
};

export const activeInventoryChainId = stageConfig.chainId;

export const activeInventoryDeployment: InventoryDeployment = {
  label: stageConfig.chainLabel,
  legacy: stageConfig.legacy,
  current: stageConfig.current,
  testnet: stageConfig.stage === "testnet",
};

export const enumerableOwnerAbi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
