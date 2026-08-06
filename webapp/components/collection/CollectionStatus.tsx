"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Address, type Hash } from "viem";
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWalletClient } from "wagmi";
import { StatusLine } from "@/components/site/StatusLine";
import { WalletButton } from "@/components/wallet/WalletButton";
import { rewardsContract } from "@/lib/rewards-contracts";
import { activeMigrationContracts, onchainMigrationAbi } from "@/lib/migration-contracts";
import { useRewardsStatus } from "@/hooks/useRewardsStatus";
import { formatWalletAddress } from "@/lib/wallet-config";
import { stageConfig } from "@/lib/stage";

const MAX_SUPPLY = 10000;

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

// ── Helpers ────────────────────────────────────────────────────────────────

function formatUnixDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
  if (msg.includes("LatchNotOpen")) {
    return "The latch claim window is not open yet.";
  }
  if (msg.includes("WindowClosed")) {
    return "The latch claim window has closed.";
  }
  if (msg.includes("AlreadyClaimed")) {
    return "Latch share has already been claimed for this address.";
  }
  if (msg.includes("NotMigrated")) {
    return "You must migrate at least one punk before claiming the latch share.";
  }
  if (msg.includes("SweepNotOpen")) {
    return "The sweep window is not open yet.";
  }
  if (msg.includes("AlreadySwept")) {
    return "The residue has already been swept.";
  }
  if (msg.includes("NotInitialized")) {
    return "The rewards contract is not yet initialized.";
  }
  if (msg.includes("TransferFailed")) {
    return "ETH transfer failed — the recipient wallet may not accept ETH.";
  }

  return `${action} failed. Check your wallet and try again.`;
}

// ── Public entry-point ─────────────────────────────────────────────────────

export function CollectionStatus() {
  if (rewardsContract.address === undefined) {
    return (
      <p className="rewards-notice">
        Rewards are not configured for this stage.
      </p>
    );
  }

  return <CollectionStatusInner contractAddress={rewardsContract.address} />;
}

// ── Inner component (contract address guaranteed) ─────────────────────────

function CollectionStatusInner({ contractAddress }: { contractAddress: Address }) {
  const { address, chain, chainId, isConnected } = useAccount();
  const { switchChain, isPending: switchingNetwork } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: rewardsContract.chainId });
  const queryClient = useQueryClient();

  const status = useRewardsStatus();

  const [transaction, setTransaction] = useState<TransactionState>(idleTransaction);

  const isTargetChain = chainId === rewardsContract.chainId;
  const busy = transaction.phase === "signing" || transaction.phase === "confirming";

  // ── Population stats reads ────────────────────────────────────────────────

  const totalMigratedResult = useReadContract({
    address: activeMigrationContracts.current,
    abi: onchainMigrationAbi,
    functionName: "totalMigrated",
    chainId: activeMigrationContracts.chainId,
    query: { enabled: activeMigrationContracts.current !== undefined },
  });

  const totalYear1Result = useReadContract({
    address: contractAddress,
    abi: rewardsContract.abi,
    functionName: "totalYear1",
    chainId: rewardsContract.chainId,
  });

  // ── Write: claimLatch ────────────────────────────────────────────────────

  async function handleClaimLatch() {
    if (!walletClient || !publicClient || !address || !isTargetChain) return;

    setTransaction({
      message: "Confirm latch claim in your wallet.",
      phase: "signing",
    });

    try {
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: rewardsContract.abi,
        functionName: "claimLatch",
        args: [address],
      });

      setTransaction({
        hash,
        message: "Latch claim submitted. Waiting for network confirmation.",
        phase: "confirming",
      });

      await publicClient.waitForTransactionReceipt({ hash });
      await queryClient.invalidateQueries();

      setTransaction({
        hash,
        message: "Latch share claimed successfully.",
        phase: "success",
      });
    } catch (error) {
      setTransaction({
        message: transactionError("Latch claim", error),
        phase: "error",
      });
    }
  }

  // ── Write: sweep ─────────────────────────────────────────────────────────

  async function handleSweep() {
    if (!walletClient || !publicClient || !isTargetChain) return;

    setTransaction({
      message: "Confirm sweep in your wallet.",
      phase: "signing",
    });

    try {
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: rewardsContract.abi,
        functionName: "sweep",
        args: [],
      });

      setTransaction({
        hash,
        message: "Sweep submitted. Waiting for network confirmation.",
        phase: "confirming",
      });

      await publicClient.waitForTransactionReceipt({ hash });
      await queryClient.invalidateQueries();

      setTransaction({
        hash,
        message: "Residue swept successfully.",
        phase: "success",
      });
    } catch (error) {
      setTransaction({
        message: transactionError("Sweep", error),
        phase: "error",
      });
    }
  }

  // ── Population stats section ──────────────────────────────────────────────

  function populationStatsBody() {
    if (totalMigratedResult.isError || totalYear1Result.isError) {
      return <p className="rewards-state error">Could not read collection totals. Try again.</p>;
    }
    const totalMigrated = totalMigratedResult.data as bigint | undefined;
    const totalYear1 = totalYear1Result.data as bigint | undefined;

    const migratedNum = totalMigrated !== undefined ? Number(totalMigrated) : null;
    const year1Num = totalYear1 !== undefined ? Number(totalYear1) : null;
    const percent =
      migratedNum !== null
        ? ((migratedNum / MAX_SUPPLY) * 100).toFixed(1)
        : null;

    return (
      <div className="collection-stats">
        <div className="collection-stat-tile">
          <span className="collection-stat-label">Total migrated</span>
          <span className="collection-stat-value">
            {migratedNum !== null
              ? `${migratedNum.toLocaleString()} / ${MAX_SUPPLY.toLocaleString()}`
              : "—"}
          </span>
          {percent !== null ? (
            <span className="collection-stat-sub">{percent}% onchain</span>
          ) : null}
        </div>
        <div className="collection-stat-tile">
          <span className="collection-stat-label">Year 1 migrations</span>
          <span className="collection-stat-value">
            {year1Num !== null ? year1Num.toLocaleString() : "—"}
          </span>
        </div>
      </div>
    );
  }

  // ── Phase clock section ──────────────────────────────────────────────────

  function phaseClockBody() {
    if (status.error) {
      return <p className="rewards-state error">Could not read the rewards contract. Try again.</p>;
    }

    if (!status.ready) {
      return <p className="rewards-state">Loading phase data…</p>;
    }

    const phaseLabel: Record<string, string> = {
      reward: "Reward phase",
      latch: "Latch phase",
      terminal: "Terminal phase",
    };

    const currentPhaseLabel = status.phase ? (phaseLabel[status.phase] ?? status.phase) : "Unknown";

    return (
      <dl className="rewards-phase-clock">
        <div className="rewards-phase-row">
          <dt>Current phase</dt>
          <dd>
            <strong>{currentPhaseLabel}</strong>
          </dd>
        </div>
        {status.rewardEnds !== null ? (
          <div className="rewards-phase-row">
            <dt>Reward window closes</dt>
            <dd>{formatUnixDate(status.rewardEnds)}</dd>
          </div>
        ) : null}
        {status.latchEnds !== null ? (
          <div className="rewards-phase-row">
            <dt>Latch window closes</dt>
            <dd>{formatUnixDate(status.latchEnds)}</dd>
          </div>
        ) : null}
      </dl>
    );
  }

  // ── Latch claim section: gated state ─────────────────────────────────────

  function latchBody() {
    if (status.error) {
      return <p className="rewards-state error">Could not read the rewards contract. Try again.</p>;
    }

    if (!status.ready) {
      return <p className="rewards-state">Loading claim status…</p>;
    }

    if (!isConnected || !address) {
      return (
        <p className="rewards-state">Connect a wallet to claim your latch share.</p>
      );
    }

    if (status.phase !== "latch") {
      if (status.phase === "reward") {
        return (
          <p className="rewards-state">
            Latch claim opens after the reward phase ends
            {status.rewardEnds !== null ? ` (${formatUnixDate(status.rewardEnds)})` : ""}.
          </p>
        );
      }
      if (status.phase === "terminal") {
        return <p className="rewards-state">The latch claim window has closed.</p>;
      }
      return <p className="rewards-state">Latch claim is not available in the current phase.</p>;
    }

    // phase === "latch"
    if (status.migratedCount !== null && status.migratedCount === BigInt(0)) {
      return (
        <p className="rewards-state">
          You have not migrated any punks — latch share requires at least one migration.
        </p>
      );
    }

    if (status.latchClaimed === true) {
      return <p className="rewards-state">Latch share already claimed.</p>;
    }

    return (
      <div className="rewards-claim-action">
        <p>
          The latch window is open
          {status.latchEnds !== null ? ` until ${formatUnixDate(status.latchEnds)}` : ""}.
          Your share is proportional to your migration count.
        </p>
        {!isTargetChain ? (
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
            onClick={handleClaimLatch}
          >
            Claim latch share
          </button>
        )}
      </div>
    );
  }

  // ── Sweep section: gated state ────────────────────────────────────────────

  function sweepBody() {
    if (status.error) {
      return <p className="rewards-state error">Could not read the rewards contract. Try again.</p>;
    }

    if (!status.ready) {
      return <p className="rewards-state">Loading sweep status…</p>;
    }

    if (status.phase !== "terminal") {
      return (
        <p className="rewards-state">
          Sweep opens after month 24
          {status.latchEnds !== null ? ` (after ${formatUnixDate(status.latchEnds)})` : ""}.
        </p>
      );
    }

    if (!isConnected || !address) {
      return <p className="rewards-state">Connect any wallet on {stageConfig.chainLabel} to trigger the sweep.</p>;
    }

    // phase === "terminal"
    if (status.swept === true) {
      return <p className="rewards-state">Residue has already been swept.</p>;
    }

    return (
      <div className="rewards-claim-action">
        <p>
          The terminal phase is active. Any unclaimed residue can be swept to the
          designated sweep address. This is permissionless — anyone can call it.
        </p>
        {!isTargetChain ? (
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
            disabled={busy || !status.ready}
            onClick={handleSweep}
          >
            Sweep residue
          </button>
        )}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const showTransaction = transaction.phase !== "idle";

  return (
    <div className="rewards-panel">
      {stageConfig.stage === "testnet" ? <p className="testnet-banner">Sepolia rehearsal</p> : null}
      <StatusLine status={status.error ? "open" : status.ready ? "current" : "open"}>
        {status.error ? "Rewards contract unavailable" : status.ready ? "Rewards contract connected" : "Loading rewards status…"}
      </StatusLine>

      {/* ── Population stats section ── */}
      <section className="rewards-section">
        <h3>Collection population</h3>
        <p className="rewards-description">
          Migration progress across the full 10,000-punk collection.
        </p>
        {populationStatsBody()}
      </section>

      {/* ── Phase clock section ── */}
      <section className="rewards-section">
        <h3>Phase timeline</h3>
        <p className="rewards-description">
          Wind-down schedule for the rewards programme. Read-only.
        </p>
        {phaseClockBody()}
      </section>

      {/* ── Latch claim section ── */}
      <section className="rewards-section">
        <h3>Latch claim</h3>
        <p className="rewards-description">
          Proportional share of the latch pot for migrators. Claimable during month 13–24.
        </p>
        {latchBody()}
      </section>

      {/* ── Sweep section ── */}
      <section className="rewards-section">
        <h3>Sweep</h3>
        <p className="rewards-description">
          Permissionless sweep of unclaimed residue after month 24. Funds go to the designated
          sweep address.
        </p>
        {sweepBody()}
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

      {/* ── Wallet status ── */}
      <aside className="rewards-wallet">
        <div className={`migration-wallet ${isConnected ? "connected" : ""}`}>
          <strong>{isConnected ? "Wallet connected" : "Wallet required"}</strong>
          <span>
            {address
              ? `${formatWalletAddress(address)} on ${chain?.name ?? "Ethereum"}. Actions use ${stageConfig.chainLabel}.`
              : "Connect your wallet to manage latch and sweep actions."}
          </span>
          {!isConnected ? <WalletButton appearance="panel" /> : null}
          {isConnected && !isTargetChain ? (
            <button
              className="button dark wallet-panel-button"
              type="button"
              disabled={switchingNetwork}
              onClick={() => switchChain({ chainId: rewardsContract.chainId })}
            >
              {switchingNetwork ? "Switching…" : "Switch network"}
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
