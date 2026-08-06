"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { usePunkInventory } from "@/components/wallet/usePunkInventory";
import { useViewerWallet } from "@/components/wallet/useViewerWallet";
import {
  activeMigrationContracts,
  legacyMigrationAbi,
  onchainMigrationAbi,
} from "@/lib/migration-contracts";
import {
  selectAllEligible,
  clampSelection,
} from "@/components/holder/migration-selection";
import { activeStep, type WizardStep } from "@/components/holder/wizard-steps";

type TxState = {
  hash?: `0x${string}`;
  message: string;
  phase: "idle" | "signing" | "confirming" | "success" | "error";
};
const idleTx: TxState = { message: "", phase: "idle" };

function txError(action: string, error: unknown): string {
  if (error instanceof Error && error.message.toLowerCase().includes("user rejected")) {
    return `${action} cancelled in your wallet.`;
  }
  if (error instanceof Error && error.message) return error.message;
  return `${action} failed. Check your wallet and try again.`;
}

function pause(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function waitForReceipt(
  client: NonNullable<ReturnType<typeof usePublicClient>>,
  hash: `0x${string}`,
) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const receipt = await client.getTransactionReceipt({ hash });
      if (receipt.status === "reverted") throw new Error("Transaction reverted.");
      return receipt;
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (!message.includes("not found") && !message.includes("could not be found")) {
        throw error;
      }
      await pause(2000);
    }
  }
  throw new Error("Confirmation is taking longer than expected. Check the transaction link.");
}

async function sendDevTransaction(body: Record<string, unknown>): Promise<`0x${string}`> {
  const response = await fetch("/api/dev-wallet", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { error?: string; hash?: `0x${string}` };
  if (!response.ok || !result.hash) {
    throw new Error(result.error ?? "Development transaction failed.");
  }
  return result.hash;
}

export interface MigrationWizard {
  step: WizardStep;
  connected: boolean;
  correctNetwork: boolean;
  switchNetwork: () => void;
  switchingNetwork: boolean;
  eligible: bigint[];
  selected: bigint[];
  selectedCount: number;
  remaining: number;
  approved: boolean;
  migrated: boolean;
  busy: boolean;
  tx: TxState;
  setSelected: (ids: bigint[]) => void;
  selectAll: () => void;
  approve: () => Promise<void>;
  migrate: () => Promise<void>;
  reset: () => void;
}

export function useMigrationWizard(): MigrationWizard {
  const { address, chainId, isConnected, isReadOnlyViewer } = useViewerWallet();
  const { switchChain, isPending: switchingNetwork } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: activeMigrationContracts.chainId });
  const queryClient = useQueryClient();

  const legacy = usePunkInventory("legacy");
  const eligible = legacy.tokenIds;
  const useDevSigner = isReadOnlyViewer && process.env.NODE_ENV === "development";
  const connected = isConnected || useDevSigner;
  const correctNetwork = useDevSigner || chainId === activeMigrationContracts.chainId;
  const legacyContract = activeMigrationContracts.legacy;
  const currentContract = activeMigrationContracts.current;

  const [userOverride, setUserOverride] = useState<bigint[] | null>(null);
  const selected = userOverride ?? selectAllEligible(eligible);
  const [migrated, setMigrated] = useState(false);
  const [remainingCount, setRemainingCount] = useState(0);
  const [tx, setTx] = useState<TxState>(idleTx);

  const approval = useQuery({
    queryKey: ["xpunks", "migration", "approval", address],
    enabled: Boolean(address && publicClient && legacyContract && currentContract),
    queryFn: async () => {
      if (!address || !publicClient || !legacyContract || !currentContract) return false;
      return publicClient.readContract({
        address: legacyContract,
        abi: legacyMigrationAbi,
        functionName: "isApprovedForAll",
        args: [address, currentContract],
      });
    },
  });

  const approved = approval.data === true;
  const selectedCount = selected.length;
  const busy = tx.phase === "signing" || tx.phase === "confirming";
  const step = activeStep({ approved, selectedCount, migrated });

  function setSelected(ids: bigint[]) {
    setUserOverride(clampSelection(ids));
  }
  function selectAll() {
    setUserOverride(selectAllEligible(eligible));
  }
  function reset() {
    setTx(idleTx);
    setMigrated(false);
    setRemainingCount(0);
    setUserOverride(null);
  }

  async function approve() {
    if (
      !address ||
      !publicClient ||
      !correctNetwork ||
      !legacyContract ||
      !currentContract ||
      (!walletClient && !useDevSigner)
    ) return;

    setTx({ message: useDevSigner ? "Submitting rehearsal approval." : "Confirm approval in your wallet.", phase: "signing" });
    try {
      const hash = useDevSigner
        ? await sendDevTransaction({ action: "approve", address })
        : await walletClient!.writeContract({
            address: legacyContract,
            abi: legacyMigrationAbi,
            functionName: "setApprovalForAll",
            args: [currentContract, true],
          });
      setTx({ hash, message: "Approval submitted. Waiting for confirmation.", phase: "confirming" });
      await waitForReceipt(publicClient, hash);
      await queryClient.invalidateQueries({ queryKey: ["xpunks", "migration", "approval"] });
      setTx({ hash, message: "Approval confirmed.", phase: "success" });
    } catch (error) {
      setTx({ message: txError("Approval", error), phase: "error" });
    }
  }

  async function migrate() {
    if (
      !address ||
      !publicClient ||
      !correctNetwork ||
      !currentContract ||
      selectedCount === 0 ||
      (!walletClient && !useDevSigner)
    ) return;

    setTx({
      message: useDevSigner
        ? `Submitting rehearsal migration for ${selectedCount} xPunks.`
        : selectedCount === 1
          ? `Confirm migration of #${selected[0]} in your wallet.`
          : `Confirm migration of ${selectedCount} xPunks in your wallet.`,
      phase: "signing",
    });
    try {
      const hash = useDevSigner
        ? await sendDevTransaction({
            action: "migrate",
            address,
            tokenIds: selected.map(String),
          })
        : selectedCount === 1
          ? await walletClient!.writeContract({
              address: currentContract,
              abi: onchainMigrationAbi,
              functionName: "migrate",
              args: [selected[0]],
            })
          : await walletClient!.writeContract({
              address: currentContract,
              abi: onchainMigrationAbi,
              functionName: "migrateBatch",
              args: [selected],
            });
      setTx({ hash, message: "Migration submitted. Waiting for confirmation.", phase: "confirming" });
      await waitForReceipt(publicClient, hash);
      await queryClient.invalidateQueries();
      setRemainingCount(Math.max(eligible.length - selectedCount, 0));
      setMigrated(true);
      setTx({
        hash,
        message: selectedCount === 1
          ? `#${selected[0]} is now an onchain ExpansionPunk.`
          : `${selectedCount} xPunks are now onchain.`,
        phase: "success",
      });
    } catch (error) {
      setTx({ message: txError("Migration", error), phase: "error" });
    }
  }

  return {
    step,
    connected,
    correctNetwork,
    switchNetwork: () => {
      if (!useDevSigner) switchChain({ chainId: activeMigrationContracts.chainId });
    },
    switchingNetwork,
    eligible,
    selected,
    selectedCount,
    remaining: migrated ? remainingCount : eligible.length,
    approved,
    migrated,
    busy,
    tx,
    setSelected,
    selectAll,
    approve,
    migrate,
    reset,
  };
}
