"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatEther, type Address, type Hash, type Hex } from "viem";
import { usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { useViewerWallet } from "@/components/wallet/useViewerWallet";
import { rewardsContract } from "@/lib/rewards-contracts";
import { useRewardsStatus } from "@/hooks/useRewardsStatus";
import {
  loadParticipationMerkle,
  lookupParticipation,
  participationTreeMatches,
  type MerkleFile,
} from "@/lib/participation-proof";
import { stageConfig } from "@/lib/stage";

// ── Types ──────────────────────────────────────────────────────────────────

type TransactionState = {
  hash?: Hash;
  message: string;
  phase: "idle" | "signing" | "confirming" | "success" | "error";
};

const idleTransaction: TransactionState = {
  message: "",
  phase: "idle",
};
async function sendDevClaim(
  address: Address,
  amountWei: bigint,
  proof: Hex[],
): Promise<Hash> {
  const response = await fetch("/api/dev-wallet", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "claimParticipation",
      address,
      amountWei: amountWei.toString(),
      proof,
    }),
  });
  const result = (await response.json()) as { error?: string; hash?: Hash };
  if (!response.ok || !result.hash) {
    throw new Error(result.error ?? "Development claim failed.");
  }
  return result.hash;
}

// ── Error classifier ───────────────────────────────────────────────────────

function transactionError(action: string, error: unknown): string {
  if (!(error instanceof Error)) {
    return `${action} failed. Check your wallet and try again.`;
  }

  const msg = error.message;

  if (msg.toLowerCase().includes("user rejected")) {
    return `${action} cancelled in your wallet.`;
  }
  if (msg.includes("InvalidProof")) {
    return "Proof rejected — allocation not found for this address.";
  }
  if (msg.includes("NotMigrated")) {
    return "You must migrate at least one punk before claiming.";
  }
  if (msg.includes("AlreadyClaimed")) {
    return "Participation reward has already been claimed for this address.";
  }
  if (msg.includes("WindowClosed")) {
    return "The participation claim window has closed.";
  }
  if (msg.includes("NothingPending")) {
    return "No pending balance to withdraw.";
  }
  if (msg.includes("TransferFailed")) {
    return "ETH transfer to your wallet failed — your wallet may not accept ETH.";
  }

  return `${action} failed. Check your wallet and try again.`;
}

// ── Public entry-point ─────────────────────────────────────────────────────

export function RewardsSection() {
  if (rewardsContract.address === undefined) {
    return (
      <section id="rewards" className="rewards-section-block">
        <p className="rewards-notice">
          Rewards are not configured for this stage.
        </p>
      </section>
    );
  }

  return <RewardsSectionInner contractAddress={rewardsContract.address} />;
}

// ── Inner component (contract address guaranteed) ─────────────────────────

function RewardsSectionInner({ contractAddress }: { contractAddress: Address }) {
  const { address, chainId, isConnected, isReadOnlyViewer } = useViewerWallet();
  const { switchChain, isPending: switchingNetwork } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: rewardsContract.chainId });
  const queryClient = useQueryClient();

  const status = useRewardsStatus();

  // Merkle / participation state
  const [merkle, setMerkle] = useState<MerkleFile | null>(null);
  const [merkleError, setMerkleError] = useState<string | null>(() =>
    stageConfig.rewardsMerkleUrl ? null : "Participation data is not configured for this release.",
  );

  // Transaction feedback — shared between pending-withdraw and participation-claim
  const [transaction, setTransaction] = useState<TransactionState>(idleTransaction);

  const isTargetChain = chainId === rewardsContract.chainId;
  const useDevSigner = isReadOnlyViewer && process.env.NODE_ENV === "development";
  const hasViewer = isConnected || useDevSigner;
  const busy = transaction.phase === "signing" || transaction.phase === "confirming";

  // Load the proof set selected by the active release stage.
  useEffect(() => {
    let cancelled = false;
    const url = stageConfig.rewardsMerkleUrl;

    if (!url) return;

    loadParticipationMerkle(url)
      .then((data) => {
        if (!cancelled) setMerkle(data);
      })
      .catch(() => {
        if (!cancelled) setMerkleError("Could not load participation data.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Derived values
  const treeMatches =
    merkle && status.merkleRoot && status.participationTotal !== null
      ? participationTreeMatches(merkle, status.merkleRoot, status.participationTotal)
      : null;
  const allocation =
    treeMatches === true && merkle && address ? lookupParticipation(merkle, address) : null;

  const earnedBase =
    status.basePerPunk !== null && status.migratedCount !== null
      ? status.basePerPunk * status.migratedCount
      : null;

  const hasPending = status.pending !== null && status.pending > BigInt(0);

  // ── Write: withdrawPending ───────────────────────────────────────────────

  async function handleWithdrawPending() {
    if (!walletClient || !publicClient || !address || !isTargetChain) return;

    setTransaction({ message: "Confirm payout retry in your wallet.", phase: "signing" });

    try {
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: rewardsContract.abi,
        functionName: "withdrawPending",
        args: [address],
      });

      setTransaction({
        hash,
        message: "Payout retry submitted. Waiting for network confirmation.",
        phase: "confirming",
      });

      await publicClient.waitForTransactionReceipt({ hash });
      await queryClient.invalidateQueries();

      setTransaction({
        hash,
        message: "Pending balance withdrawn successfully.",
        phase: "success",
      });
    } catch (error) {
      setTransaction({
        message: transactionError("Payout retry", error),
        phase: "error",
      });
    }
  }

  // ── Write: claimParticipation ────────────────────────────────────────────

  async function handleClaimParticipation() {
    if (
      !publicClient ||
      !address ||
      !allocation ||
      (!isTargetChain && !useDevSigner) ||
      (!walletClient && !useDevSigner)
    ) return;

    const amountWei = BigInt(allocation.amountWei);

    setTransaction({
      message: `Confirm claim of ${formatEther(amountWei)} ETH in your wallet.`,
      phase: "signing",
    });

    try {
      const hash = useDevSigner
        ? await sendDevClaim(address, amountWei, allocation.proof)
        : await walletClient!.writeContract({
            address: contractAddress,
            abi: rewardsContract.abi,
            functionName: "claimParticipation",
            args: [amountWei, allocation.proof, address],
          });

      setTransaction({
        hash,
        message: "Participation claim submitted. Waiting for network confirmation.",
        phase: "confirming",
      });

      await publicClient.waitForTransactionReceipt({ hash });
      await queryClient.invalidateQueries();

      setTransaction({
        hash,
        message: `${formatEther(amountWei)} ETH participation reward claimed.`,
        phase: "success",
      });
    } catch (error) {
      setTransaction({
        message: transactionError("Claim", error),
        phase: "error",
      });
    }
  }

  // ── Participation section: gated state label ────────────────────────────

  function participationBody() {
    if (!hasViewer || !address) {
      return <p className="rewards-state">Connect a wallet to check your participation allocation.</p>;
    }

    if (merkleError) {
      return <p className="rewards-state error">{merkleError}</p>;
    }

    if (!merkle) {
      return <p className="rewards-state">Loading participation data…</p>;
    }

    if (status.error) {
      return <p className="rewards-state error">Could not read the rewards contract. Try again.</p>;
    }

    if (!status.ready) {
      return <p className="rewards-state">Loading claim status…</p>;
    }

    if (treeMatches !== true) {
      return <p className="rewards-state error">Published participation data does not match the reward contract.</p>;
    }

    if (allocation === null) {
      return <p className="rewards-state">Your address has no participation allocation.</p>;
    }
    if (status.migratedCount !== null && status.migratedCount === BigInt(0)) {
      return <p className="rewards-state">Migrate at least one punk to unlock participation.</p>;
    }

    if (status.participationClaimed === true) {
      return <p className="rewards-state">Participation reward already claimed.</p>;
    }

    if (status.phase !== "reward") {
      return <p className="rewards-state">The participation claim window has closed.</p>;
    }

    const amountWei = BigInt(allocation.amountWei);

    return (
      <div className="rewards-claim-action">
        <p>
          Allocated: <strong>{formatEther(amountWei)} ETH</strong>
        </p>
        {!isTargetChain && !useDevSigner ? (
          <button
            className="button dark"
            type="button"
            disabled={switchingNetwork}
            onClick={() => switchChain({ chainId: rewardsContract.chainId })}
          >
            {switchingNetwork ? "Switching…" : "Switch network"}
          </button>
        ) : (
          <button
            className="button dark"
            type="button"
            disabled={busy || !status.ready}
            onClick={handleClaimParticipation}
          >
            Claim {formatEther(amountWei)} ETH
          </button>
        )}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const showTransaction = transaction.phase !== "idle";

  return (
    <section id="rewards" className="rewards-section-block">
      <div className="rewards-panel">
        {/* ── Your stats ── */}
        {status.ready ? (
          <p className="rewards-stats">
            migrated {status.migratedCount?.toString() ?? "0"} · participation{" "}
            {status.participationClaimed ? "claimed" : "unclaimed"}
          </p>
        ) : null}

        {/* ── Base reward section ── */}
        <section className="rewards-section">
          <h3>Base reward</h3>
          <p className="rewards-description">
            Paid automatically on each migration. One payout per punk.
          </p>
          {status.error ? (
            <p className="rewards-state error">Could not read the rewards contract. Try again.</p>
          ) : earnedBase !== null ? (
            <p>
              Earned: <strong>{formatEther(earnedBase)} ETH</strong>
              {status.migratedCount !== null && status.migratedCount > BigInt(0)
                ? ` (${status.migratedCount.toString()} punk${status.migratedCount === BigInt(1) ? "" : "s"})`
                : null}
            </p>
          ) : (
            <p className="rewards-state">
              {hasViewer ? "Loading base reward…" : "Connect a wallet to see your base reward."}
            </p>
          )}          {hasPending && hasViewer ? (
            <div className="rewards-claim-action">
              <p className="rewards-warning">
                A previous payout failed. <strong>{formatEther(status.pending!)} ETH</strong> is held pending.
              </p>
              {!isTargetChain && !useDevSigner ? (
                <button
                  className="button dark"
                  type="button"
                  disabled={switchingNetwork}
                  onClick={() => switchChain({ chainId: rewardsContract.chainId })}
                >
                  {switchingNetwork ? "Switching…" : "Switch network"}
                </button>
              ) : (
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={handleWithdrawPending}
                >
                  Retry failed payout
                </button>
              )}
            </div>
          ) : null}
        </section>

        {/* ── Participation section ── */}
        <section className="rewards-section">
          <h3>Participation reward</h3>
          <p className="rewards-description">
            One-time claim for active participants. Claim window is open during the reward phase.
          </p>
          {participationBody()}
        </section>

        {/* ── Transaction feedback ── */}
        {showTransaction ? (
          <div className={`transaction-feedback ${transaction.phase}`} role="status">
            <p>{transaction.message}</p>
            {transaction.hash ? (
              <a
                href={`${stageConfig.explorerBaseUrl}/tx/${transaction.hash}`}
                rel="noreferrer"
                target="_blank"
              >
                View transaction
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
