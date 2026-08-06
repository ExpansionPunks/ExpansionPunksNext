import type { Address } from "viem";
import { stageConfig } from "@/lib/stage";

export const rewardsAbi = [
  // ── reads ──────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "merkleRoot",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "basePerPunk",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "migratedCount",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pending",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "participationClaimed",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "latchClaimed",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
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
    name: "totalYear1",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "swept",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "sweepAddress",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
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
    name: "LATCH_WINDOW",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "participationTotal",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "latchPot",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "latchPotSet",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  // ── writes ─────────────────────────────────────────────────────────────────
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
    type: "function",
    name: "claimLatch",
    inputs: [{ name: "to", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
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
    name: "sweep",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ── errors (for revert decoding) ───────────────────────────────────────────
  { type: "error", name: "InvalidProof", inputs: [] },
  { type: "error", name: "NotMigrated", inputs: [] },
  { type: "error", name: "AlreadyClaimed", inputs: [] },
  { type: "error", name: "WindowClosed", inputs: [] },
  { type: "error", name: "LatchNotOpen", inputs: [] },
  { type: "error", name: "SweepNotOpen", inputs: [] },
  { type: "error", name: "AlreadySwept", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
  { type: "error", name: "NotInitialized", inputs: [] },
  { type: "error", name: "NothingPending", inputs: [] },
] as const;

// Derived from the active stage. `rewards` is undefined when the stage has no
// RewardsDistributor configured (content stage, mainnet before deploy).
// `rewardsEnabled` gates the UI.
export const rewardsContract: {
  chainId: number;
  address: Address | undefined;
  abi: typeof rewardsAbi;
} = {
  chainId: stageConfig.chainId,
  address: stageConfig.rewards,
  abi: rewardsAbi,
};

export const rewardsEnabled = stageConfig.rewards !== undefined;
