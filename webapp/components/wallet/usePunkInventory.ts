"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import {
  activeInventoryChainId,
  activeInventoryDeployment,
  enumerableOwnerAbi,
  type InventoryCollection,
} from "@/lib/collection-contracts";

type CollectionKind = "legacy" | "current";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);

export function usePunkInventory(kind: CollectionKind) {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: activeInventoryChainId });
  const collection = activeInventoryDeployment[kind];

  const query = useQuery({
    queryKey: ["xpunks", "owned", activeInventoryChainId, address, kind, collection?.address],
    enabled: Boolean(address && client && collection),
    staleTime: 30_000,
    queryFn: async () => {
      if (!address || !client || !collection) return [];

      if (collection.strategy === "enumerable") {
        const count = await client.readContract({
          address: collection.address,
          abi: enumerableOwnerAbi,
          functionName: "balanceOf",
          args: [address],
        });

        return Promise.all(
          Array.from({ length: Number(count) }, (_, index) =>
            client.readContract({
              address: collection.address,
              abi: enumerableOwnerAbi,
              functionName: "tokenOfOwnerByIndex",
              args: [address, BigInt(index)],
            }),
          ),
        ).then(sortTokenIds);
      }

      return tokensFromEvents(client, collection, address);
    },
  });

  return {
    ...query,
    collection,
    deployment: activeInventoryDeployment,
    tokenIds: query.data ?? [],
  };
}

async function tokensFromEvents(
  client: NonNullable<ReturnType<typeof usePublicClient>>,
  collection: Extract<InventoryCollection, { strategy: "events" }>,
  address: Address,
) {
  const received = await client.getLogs({
    address: collection.address,
    event: transferEvent,
    args: { to: address },
    fromBlock: collection.fromBlock,
    toBlock: "latest",
  });
  const sent = await client.getLogs({
    address: collection.address,
    event: transferEvent,
    args: { from: address },
    fromBlock: collection.fromBlock,
    toBlock: "latest",
  });
  const owned = new Set<bigint>();
  const logs = [...received, ...sent].sort((left, right) => {
    if (left.blockNumber !== right.blockNumber) {
      return Number(left.blockNumber - right.blockNumber);
    }
    return Number(left.logIndex - right.logIndex);
  });

  for (const log of logs) {
    const tokenId = log.args.tokenId;
    if (tokenId === undefined) continue;

    if (log.args.to?.toLowerCase() === address.toLowerCase()) {
      owned.add(tokenId);
    } else {
      owned.delete(tokenId);
    }
  }

  return sortTokenIds([...owned]);
}

function sortTokenIds(tokenIds: readonly bigint[]) {
  return [...tokenIds].sort((left, right) => Number(left - right));
}
