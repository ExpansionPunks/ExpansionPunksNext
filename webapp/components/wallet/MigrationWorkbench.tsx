"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Address, type Hash, isAddressEqual } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { StageGate } from "@/components/site/StageGate";
import { StatusLine } from "@/components/site/StatusLine";
import { WalletButton } from "@/components/wallet/WalletButton";
import { usePunkInventory } from "@/components/wallet/usePunkInventory";
import {
  activeMigrationContracts,
  legacyMigrationAbi,
  maxMigrationBatchSize,
  migrationEnabled,
  onchainMigrationAbi,
} from "@/lib/migration-contracts";
import { formatWalletAddress } from "@/lib/wallet-config";

type TransactionState = {
  hash?: Hash;
  message: string;
  phase: "idle" | "signing" | "confirming" | "success" | "error";
  tokenId?: string;
};

const idleTransaction: TransactionState = {
  message: "",
  phase: "idle",
};

export function MigrationWorkbench() {
  const { legacy: legacyContract, current: currentContract } = activeMigrationContracts;

  if (!migrationEnabled || !legacyContract || !currentContract) {
    return (
      <StageGate
        title="Migration opens after mainnet deployment."
        ctaHref="/migration#timeline"
        ctaLabel="See the execution path"
      >
        The onchain contract is being verified and prepared for mainnet. Nothing
        to do yet.
      </StageGate>
    );
  }

  return (
    <MigrationWorkbenchInner legacyContract={legacyContract} currentContract={currentContract} />
  );
}

function MigrationWorkbenchInner({
  legacyContract,
  currentContract,
}: {
  legacyContract: Address;
  currentContract: Address;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, chain, chainId, isConnected } = useAccount();
  const { switchChain, isPending: switchingNetwork } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: activeMigrationContracts.chainId });
  const queryClient = useQueryClient();
  const legacyInventory = usePunkInventory("legacy");
  const urlTokenId = parseTokenId(searchParams.get("punk"));
  const firstHeldTokenId = legacyInventory.tokenIds[0] ?? null;
  const selectedTokenId = urlTokenId ?? firstHeldTokenId;
  const selectedId = selectedTokenId?.toString() ?? "";
  const isSepolia = chainId === activeMigrationContracts.chainId;
  const [transaction, setTransaction] = useState<TransactionState>(idleTransaction);
  const [batchSelection, setBatchSelection] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!urlTokenId && firstHeldTokenId) {
      router.replace(`/holder?punk=${firstHeldTokenId}`, { scroll: false });
    }
  }, [firstHeldTokenId, router, urlTokenId]);

  const approval = useQuery({
    queryKey: ["xpunks", "migration", "approval", address],
    enabled: Boolean(address && publicClient),
    queryFn: async () => {
      if (!address || !publicClient) return false;

      return publicClient.readContract({
        address: legacyContract,
        abi: legacyMigrationAbi,
        functionName: "isApprovedForAll",
        args: [address, currentContract],
      });
    },
  });

  const selectedState = useQuery({
    queryKey: ["xpunks", "migration", "token", address, selectedId],
    enabled: Boolean(address && publicClient && selectedTokenId),
    queryFn: async () => {
      if (!address || !publicClient || !selectedTokenId) {
        return { migrated: false, ownedByWallet: false };
      }

      const migrated = await publicClient.readContract({
        address: currentContract,
        abi: onchainMigrationAbi,
        functionName: "isMigrated",
        args: [selectedTokenId],
      });

      if (migrated) {
        return { migrated: true, ownedByWallet: false };
      }

      try {
        const owner = await publicClient.readContract({
          address: legacyContract,
          abi: legacyMigrationAbi,
          functionName: "ownerOf",
          args: [selectedTokenId],
        });

        return {
          migrated: false,
          ownedByWallet: isAddressEqual(owner, address),
        };
      } catch {
        return { migrated: false, ownedByWallet: false };
      }
    },
  });

  const approved = approval.data === true;
  const migrated = selectedState.data?.migrated === true;
  const ownedByWallet = selectedState.data?.ownedByWallet === true;
  const migratableTokenIds = legacyInventory.tokenIds;
  const selectedMigrationIds = batchSelection === null
    ? selectedTokenId && migratableTokenIds.includes(selectedTokenId)
      ? [selectedTokenId]
      : []
    : migratableTokenIds
      .filter((tokenId) => batchSelection.has(tokenId.toString()))
      .slice(0, maxMigrationBatchSize);
  const selectedCount = selectedMigrationIds.length;
  const busy = transaction.phase === "signing" || transaction.phase === "confirming";
  const showTransaction = transaction.phase !== "idle"
    && (!transaction.tokenId || transaction.tokenId === selectedId);

  async function approveMigration() {
    if (!walletClient || !publicClient || !isSepolia) return;

    setTransaction({
      message: "Confirm approval in your wallet.",
      phase: "signing",
    });

    try {
      const hash = await walletClient.writeContract({
        address: legacyContract,
        abi: legacyMigrationAbi,
        functionName: "setApprovalForAll",
        args: [currentContract, true],
      });

      setTransaction({
        hash,
        message: "Approval submitted. Waiting for Sepolia confirmation.",
        phase: "confirming",
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await queryClient.invalidateQueries({ queryKey: ["xpunks", "migration", "approval"] });
      setTransaction({
        hash,
        message: "Approval confirmed. Your legacy xPunks are ready to migrate.",
        phase: "success",
      });
    } catch (error) {
      setTransaction({
        message: transactionError("Approval", error),
        phase: "error",
      });
    }
  }

  async function migrateSelection() {
    if (!walletClient || !publicClient || selectedCount === 0 || !isSepolia) return;

    setTransaction({
      message: selectedCount === 1
        ? `Confirm migration of #${selectedMigrationIds[0]} in your wallet.`
        : `Confirm migration of ${selectedCount} xPunks in your wallet.`,
      phase: "signing",
      tokenId: selectedId,
    });

    try {
      const hash = selectedCount === 1
        ? await walletClient.writeContract({
          address: currentContract,
          abi: onchainMigrationAbi,
          functionName: "migrate",
          args: [selectedMigrationIds[0]],
        })
        : await walletClient.writeContract({
          address: currentContract,
          abi: onchainMigrationAbi,
          functionName: "migrateBatch",
          args: [selectedMigrationIds],
        });

      setTransaction({
        hash,
        message: selectedCount === 1
          ? `Migration for #${selectedMigrationIds[0]} submitted. Waiting for confirmation.`
          : `Migration for ${selectedCount} xPunks submitted. Waiting for confirmation.`,
        phase: "confirming",
        tokenId: selectedId,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["xpunks", "owned"] }),
        queryClient.invalidateQueries({ queryKey: ["xpunks", "migration", "token"] }),
      ]);
      setTransaction({
        hash,
        message: selectedCount === 1
          ? `#${selectedMigrationIds[0]} is now an onchain ExpansionPunk.`
          : `${selectedCount} xPunks are now onchain.`,
        phase: "success",
        tokenId: selectedId,
      });
    } catch (error) {
      setTransaction({
        message: transactionError("Migration", error),
        phase: "error",
        tokenId: selectedId,
      });
    }
  }

  return (
    <>
      <div className="migration-panel">
        <p className="testnet-banner">Sepolia rehearsal</p>
        <StatusLine status={migrated ? "done" : "current"}>
          {migrated ? "This xPunk has migrated onchain" : "Testing the live migration flow"}
        </StatusLine>
        <div className="migration-heading">
          <h2>Choose your xPunk</h2>
          <p>Same punk, same ID, stronger storage. This rehearsal uses Sepolia test tokens.</p>
        </div>
        <label className="migration-selector">
          <span>Legacy xPunk to migrate</span>
          <select
            value={selectedId}
            disabled={legacyInventory.isLoading || legacyInventory.tokenIds.length === 0}
            onChange={(event) => {
              setTransaction(idleTransaction);
              setBatchSelection(null);
              router.replace(`/holder?punk=${event.target.value}`, { scroll: false });
            }}
          >
            {selectedTokenId && !legacyInventory.tokenIds.includes(selectedTokenId) ? (
              <option value={selectedId}>#{selectedId} {migrated ? "(migrated)" : "(selected)"}</option>
            ) : null}
            {legacyInventory.tokenIds.map((tokenId) => (
              <option key={tokenId.toString()} value={tokenId.toString()}>
                #{tokenId.toString()}
              </option>
            ))}
          </select>
        </label>
        {selectedTokenId ? (
          <MigrationCards tokenId={selectedTokenId} migrated={migrated} />
        ) : (
          <p className="inventory-state">Connect a wallet holding a legacy test xPunk to begin.</p>
        )}
        {selectedTokenId && !selectedState.isLoading && !migrated && !ownedByWallet ? (
          <p className="inventory-state">
            This legacy xPunk is not available in the connected wallet.
          </p>
        ) : null}
        {migratableTokenIds.length > 0 ? (
          <div className="batch-migration">
            <div className="batch-migration-heading">
              <div>
                <strong>Batch migration</strong>
                <p>Select up to {maxMigrationBatchSize} eligible xPunks for one transaction.</p>
              </div>
              <b>{selectedCount} selected</b>
            </div>
            <div className="batch-actions">
              <button
                type="button"
                onClick={() => setBatchSelection(
                  new Set(
                    migratableTokenIds
                      .slice(0, maxMigrationBatchSize)
                      .map((tokenId) => tokenId.toString()),
                  ),
                )}
              >
                Select first {Math.min(maxMigrationBatchSize, migratableTokenIds.length)}
              </button>
              <button type="button" onClick={() => setBatchSelection(new Set())}>
                Clear
              </button>
            </div>
            <div className="batch-token-options" aria-label="Eligible xPunks to migrate">
              {migratableTokenIds.map((tokenId) => {
                const id = tokenId.toString();
                const checked = selectedMigrationIds.includes(tokenId);
                const selectionFull = selectedCount >= maxMigrationBatchSize && !checked;

                return (
                  <label key={id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={selectionFull}
                      onChange={() => {
                        setBatchSelection((current) => {
                          const next = new Set(
                            current ?? selectedMigrationIds.map((selectedToken) => selectedToken.toString()),
                          );

                          if (next.has(id)) {
                            next.delete(id);
                          } else if (next.size < maxMigrationBatchSize) {
                            next.add(id);
                          }

                          return next;
                        });
                      }}
                    />
                    <span>#{id}</span>
                  </label>
                );
              })}
            </div>
            <p className="batch-note">
              A batch is atomic: if one selected xPunk is no longer eligible when submitted,
              none of the selected tokens migrate.
            </p>
          </div>
        ) : null}
        <div className="migration-disclosure">
          <strong>Approval is reversible. Migration is not.</strong>
          <p>
            Approval does not burn or mint anything by itself. When you migrate, your legacy
            xPunk is sent to the burn address and the onchain version is minted back to your
            wallet with the same ID.
          </p>
        </div>
        <div className="migration-actions">
          <button
            className="button secondary"
            type="button"
            disabled={!isConnected || !isSepolia || approval.isLoading || approved || busy}
            onClick={approveMigration}
          >
            {approved ? "Approved" : "Approve migration"}
          </button>
          <button
            className="button dark"
            type="button"
            disabled={!isSepolia || !approved || selectedCount === 0 || busy}
            onClick={migrateSelection}
          >
            {selectedCount > 1
              ? `Migrate ${selectedCount} xPunks`
              : selectedCount === 1
                ? `Migrate #${selectedMigrationIds[0]}`
                : "Select xPunks"}
          </button>
        </div>
        {showTransaction ? (
          <div className={`transaction-feedback ${transaction.phase}`} role="status">
            <p>{transaction.message}</p>
            {transaction.hash ? (
              <a
                href={`https://sepolia.etherscan.io/tx/${transaction.hash}`}
                rel="noreferrer"
                target="_blank"
              >
                View transaction
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
      <aside className="migration-sidebar">
        <div className={`migration-wallet ${isConnected ? "connected" : ""}`}>
          <strong>{isConnected ? "Wallet connected" : "Wallet required"}</strong>
          <span>
            {address
              ? `${formatWalletAddress(address)} on ${chain?.name ?? "Ethereum"}. This rehearsal uses Sepolia.`
              : "Connect your wallet to locate legacy xPunks eligible for migration."}
          </span>
          {!isConnected ? <WalletButton appearance="panel" /> : null}
          {isConnected && !isSepolia ? (
            <button
              className="button dark wallet-panel-button"
              type="button"
              disabled={switchingNetwork}
              onClick={() => switchChain({ chainId: activeMigrationContracts.chainId })}
            >
              {switchingNetwork ? "Switching..." : "Switch to Sepolia"}
            </button>
          ) : null}
        </div>
        <ol className="transaction-steps">
          <MigrationStep
            state={isConnected && isSepolia ? "done" : "current"}
            title="Connect"
            copy="Use Sepolia to access your test xPunks."
          />
          <MigrationStep
            state={approved ? "done" : isConnected && isSepolia ? "current" : "open"}
            title="Approve"
            copy="Approve the migration contract. Nothing moves yet."
          />
          <MigrationStep
            state={migrated ? "done" : approved && selectedCount > 0 ? "current" : "open"}
            title="Migrate"
            copy={migrated ? "The selected onchain token is now in your wallet." : "Retire selected originals and mint same-ID onchain versions."}
          />
        </ol>
        <Link className="migration-back-link" href="/holder">
          Back to holdings
        </Link>
      </aside>
    </>
  );
}

function MigrationCards({ tokenId, migrated }: { tokenId: bigint; migrated: boolean }) {
  const id = tokenId.toString();

  return (
    <div className="migration-cards">
      <article className={migrated ? "retired" : ""}>
        <Image src={`/art/punk/${id}`} width={150} height={150} alt={`Original ExpansionPunk #${id}`} />
        <b>Legacy xPunk</b>
        <span>#{id}{migrated ? " retired" : ""}</span>
      </article>
      <strong className="migration-arrow" aria-hidden="true">
        &rarr;
      </strong>
      <article className={`future ${migrated ? "minted" : ""}`}>
        <Image src={`/art/punk/${id}`} width={150} height={150} alt={`Onchain ExpansionPunk #${id}`} />
        <b>Onchain xPunk</b>
        <span>{migrated ? "In wallet" : "Same ID"}</span>
      </article>
    </div>
  );
}

function MigrationStep({
  copy,
  state,
  title,
}: {
  copy: string;
  state: "done" | "current" | "open";
  title: string;
}) {
  return (
    <li className={state}>
      <div>
        <i aria-hidden="true" />
        <strong>{title}</strong>
      </div>
      <span>{copy}</span>
    </li>
  );
}

function parseTokenId(value: string | null) {
  if (!value) return null;

  const tokenId = Number(value);

  return Number.isInteger(tokenId) && tokenId >= 10000 && tokenId <= 19999
    ? BigInt(tokenId)
    : null;
}

function transactionError(action: string, error: unknown) {
  const fallback = `${action} failed. Check your wallet and try again.`;

  if (!(error instanceof Error)) return fallback;
  if (error.message.toLowerCase().includes("user rejected")) {
    return `${action} cancelled in your wallet.`;
  }

  return fallback;
}
