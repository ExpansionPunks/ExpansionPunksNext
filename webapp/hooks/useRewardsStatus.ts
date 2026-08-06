"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { useViewerWallet } from "@/components/wallet/useViewerWallet";
import { rewardsContract } from "@/lib/rewards-contracts";
import { phaseOf, type PhaseResult } from "@/lib/rewards-phase";

export interface RewardsStatus {
  /** True when all contract reads have resolved successfully at least once */
  ready: boolean;
  /** True when any required contract read failed */
  error: boolean;
  phase: PhaseResult["phase"] | null;
  rewardEnds: number | null;
  latchEnds: number | null;
  basePerPunk: bigint | null;
  merkleRoot: `0x${string}` | null;
  participationTotal: bigint | null;
  migratedCount: bigint | null;
  pending: bigint | null;
  participationClaimed: boolean | null;
  latchClaimed: boolean | null;
  swept: boolean | null;
}

/**
 * Reads all relevant state from the RewardsDistributor contract and derives
 * the current phase using the pure `phaseOf` helper.
 *
 * Skips all reads when `rewardsContract.address` is undefined (i.e., the
 * rewards contract has not been deployed in the active stage).
 */
export function useRewardsStatus(): RewardsStatus {
  const { address } = useViewerWallet();
  const enabled = rewardsContract.address !== undefined;
  const userEnabled = enabled && address !== undefined;

  // Reactive clock for phase derivation. Seeded once (lazy initializer) and
  // ticked on an interval so the phase flips without a manual refresh — avoids
  // calling the impure Date.now() during render. Phase boundaries are months
  // apart, so a 30s cadence is ample.
  const [nowSeconds, setNowSeconds] = useState(() => BigInt(Math.floor(Date.now() / 1000)));
  useEffect(() => {
    const id = setInterval(() => setNowSeconds(BigInt(Math.floor(Date.now() / 1000))), 30_000);
    return () => clearInterval(id);
  }, []);

  const startResult = useReadContract({
    ...rewardsContract,
    functionName: "start",
    query: { enabled },
  });

  const rewardWindowResult = useReadContract({
    ...rewardsContract,
    functionName: "REWARD_WINDOW",
    query: { enabled },
  });

  const latchWindowResult = useReadContract({
    ...rewardsContract,
    functionName: "LATCH_WINDOW",
    query: { enabled },
  });

  const basePerPunkResult = useReadContract({
    ...rewardsContract,
    functionName: "basePerPunk",
    query: { enabled },
  });

  const merkleRootResult = useReadContract({
    ...rewardsContract,
    functionName: "merkleRoot",
    query: { enabled },
  });

  const participationTotalResult = useReadContract({
    ...rewardsContract,
    functionName: "participationTotal",
    query: { enabled },
  });

  const migratedCountResult = useReadContract({
    ...rewardsContract,
    functionName: "migratedCount",
    args: address ? [address] : undefined,
    query: { enabled: userEnabled },
  });

  const pendingResult = useReadContract({
    ...rewardsContract,
    functionName: "pending",
    args: address ? [address] : undefined,
    query: { enabled: userEnabled },
  });

  const participationClaimedResult = useReadContract({
    ...rewardsContract,
    functionName: "participationClaimed",
    args: address ? [address] : undefined,
    query: { enabled: userEnabled },
  });

  const latchClaimedResult = useReadContract({
    ...rewardsContract,
    functionName: "latchClaimed",
    args: address ? [address] : undefined,
    query: { enabled: userEnabled },
  });

  const sweptResult = useReadContract({
    ...rewardsContract,
    functionName: "swept",
    query: { enabled },
  });

  // Derive phase once we have start + both windows
  const start = startResult.data as bigint | undefined;
  const rewardWindow = rewardWindowResult.data as bigint | undefined;
  const latchWindow = latchWindowResult.data as bigint | undefined;

  let phase: RewardsStatus["phase"] = null;
  let rewardEnds: number | null = null;
  let latchEnds: number | null = null;

  if (start !== undefined && rewardWindow !== undefined && latchWindow !== undefined) {
    const result = phaseOf({ start, rewardWindow, latchWindow, now: nowSeconds });

    phase = result.phase;
    rewardEnds = result.rewardEnds;
    latchEnds = result.latchEnds;
  }

  const globalReady = !startResult.isLoading
    && !rewardWindowResult.isLoading
    && !latchWindowResult.isLoading
    && !basePerPunkResult.isLoading
    && !merkleRootResult.isLoading
    && !participationTotalResult.isLoading
    && !sweptResult.isLoading;

  const userReady = !userEnabled || (
    !migratedCountResult.isLoading
    && !pendingResult.isLoading
    && !participationClaimedResult.isLoading
    && !latchClaimedResult.isLoading
  );

  const globalError = startResult.isError
    || rewardWindowResult.isError
    || latchWindowResult.isError
    || basePerPunkResult.isError
    || merkleRootResult.isError
    || participationTotalResult.isError
    || sweptResult.isError;
  const userError = userEnabled && (
    migratedCountResult.isError
    || pendingResult.isError
    || participationClaimedResult.isError
    || latchClaimedResult.isError
  );
  const error = enabled && (globalError || userError);

  return {
    ready: enabled ? globalReady && userReady && !error : true,
    error,
    phase,
    rewardEnds,
    latchEnds,
    basePerPunk: (basePerPunkResult.data as bigint | undefined) ?? null,
    merkleRoot: (merkleRootResult.data as `0x${string}` | undefined) ?? null,
    participationTotal: (participationTotalResult.data as bigint | undefined) ?? null,
    migratedCount: (migratedCountResult.data as bigint | undefined) ?? null,
    pending: (pendingResult.data as bigint | undefined) ?? null,
    participationClaimed: (participationClaimedResult.data as boolean | undefined) ?? null,
    latchClaimed: (latchClaimedResult.data as boolean | undefined) ?? null,
    swept: (sweptResult.data as boolean | undefined) ?? null,
  };
}
