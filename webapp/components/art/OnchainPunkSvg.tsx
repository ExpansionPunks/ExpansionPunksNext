"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import {
  activeMigrationContracts,
  onchainMigrationAbi,
} from "@/lib/migration-contracts";

/**
 * Reads `tokenURI(tokenId)` from the onchain migration contract and renders
 * the decoded image. Only valid for MIGRATED tokens — the contract reverts
 * via `_requireOwned` for non-migrated IDs, which surfaces here as an error.
 *
 * Uses React Query (no fetch-in-effect) so results are cached and deduped
 * across the inventory grid, and the component stays render-pure.
 */
export function OnchainPunkSvg({ tokenId }: { tokenId: number }) {
  const publicClient = usePublicClient({ chainId: activeMigrationContracts.chainId });

  const { data: image, isLoading, isError, error } = useQuery({
    queryKey: ["xpunks", "tokenURI", activeMigrationContracts.chainId, tokenId],
    enabled: Boolean(publicClient && activeMigrationContracts.current),
    queryFn: async () => {
      if (!publicClient || !activeMigrationContracts.current) {
        throw new Error("Contract not configured.");
      }

      const uri = await publicClient.readContract({
        address: activeMigrationContracts.current,
        abi: onchainMigrationAbi,
        functionName: "tokenURI",
        args: [BigInt(tokenId)],
      });

      // uri is a data:application/json;base64,... string
      const base64Prefix = "data:application/json;base64,";
      if (typeof uri !== "string" || !uri.startsWith(base64Prefix)) {
        throw new Error("Unexpected tokenURI format.");
      }

      const metadata = JSON.parse(atob(uri.slice(base64Prefix.length))) as { image?: string };
      if (!metadata.image) {
        throw new Error("No image in token metadata.");
      }

      return metadata.image;
    },
  });

  if (isLoading) {
    return <div className="onchain-punk-svg loading" aria-label="Loading onchain art…" />;
  }

  if (isError || !image) {
    const detail = error instanceof Error ? error.message : "Not yet renderable onchain.";
    return (
      <div
        className="onchain-punk-svg error"
        aria-label="Onchain art unavailable"
        title={detail}
      />
    );
  }

  return (
    // A base64 SVG data URI — next/image adds no value and cannot optimize it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="onchain-punk-svg"
      src={image}
      alt={`Onchain ExpansionPunk #${tokenId}`}
      width={150}
      height={150}
    />
  );
}
