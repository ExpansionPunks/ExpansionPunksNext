"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type Address } from "viem";
import { usePublicClient } from "wagmi";
import { useViewerWallet } from "@/components/wallet/useViewerWallet";
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
  const { address } = useViewerWallet();
  const client = usePublicClient({ chainId: activeInventoryChainId });
  const collection = activeInventoryDeployment[kind];

  const query = useQuery({
    queryKey: [
      "xpunks",
      "owned",
      activeInventoryChainId,
      address,
      kind,
      collection?.address,
      collection?.strategy === "events" ? collection.snapshotUrl : undefined,
    ],
    enabled: Boolean(address && client && collection),
    staleTime: 30_000,
    queryFn: async () => {
      if (!address || !client || !collection) return [];

      debugInventory("query-start", {
        address,
        contract: collection.address,
        kind,
        strategy: collection.strategy,
      });

      try {
        let tokenIds: bigint[];
        if (collection.strategy === "enumerable") {
          const count = await client.readContract({
            address: collection.address,
            abi: enumerableOwnerAbi,
            functionName: "balanceOf",
            args: [address],
          });

          tokenIds = await Promise.all(
            Array.from({ length: Number(count) }, (_, index) =>
              client.readContract({
                address: collection.address,
                abi: enumerableOwnerAbi,
                functionName: "tokenOfOwnerByIndex",
                args: [address, BigInt(index)],
              }),
            ),
          ).then(sortTokenIds);
        } else {
          tokenIds = await tokensFromEvents(client, collection, address);
        }

        debugInventory("query-success", {
          address,
          contract: collection.address,
          count: tokenIds.length,
          kind,
          sample: tokenIds.slice(0, 5).map(String),
          strategy: collection.strategy,
        });
        return tokenIds;
      } catch (error) {
        debugInventory("query-error", {
          address,
          contract: collection.address,
          error: error instanceof Error ? error.message : String(error),
          kind,
          strategy: collection.strategy,
        });
        throw error;
      }
    },
  });

  return {
    ...query,
    collection,
    deployment: activeInventoryDeployment,
    tokenIds: query.data ?? [],
  };
}

const LOG_BLOCK_RANGE = BigInt(9_999);
const LOG_REQUEST_PAUSE_MS = 350;
const LOG_REQUEST_RETRIES = 5;

function debugInventory(event: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.info(`[HolderInventory] ${event}`, JSON.stringify(details));
  }
}

async function tokensFromEvents(
  client: NonNullable<ReturnType<typeof usePublicClient>>,
  collection: Extract<InventoryCollection, { strategy: "events" }>,
  address: Address,
) {
  const wallet = address.toLowerCase();
  const baseline = collection.snapshotUrl
    ? await loadOwnershipSnapshot(collection.snapshotUrl, collection.address, wallet)
    : { blockNumber: collection.fromBlock - BigInt(1), tokenIds: [] };
  const owned = new Set(baseline.tokenIds);
  const scanFromBlock = baseline.blockNumber + BigInt(1);
  const latestBlock = await client.getBlockNumber();
  debugInventory("event-scan", {
    address,
    baselineBlock: baseline.blockNumber.toString(),
    contract: collection.address,
    latestBlock: latestBlock.toString(),
    snapshotCount: baseline.tokenIds.length,
  });
  if (scanFromBlock > latestBlock) return sortTokenIds([...owned]);

  const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
  for (
    let fromBlock = scanFromBlock;
    fromBlock <= latestBlock;
    fromBlock += LOG_BLOCK_RANGE + BigInt(1)
  ) {
    const candidateEnd = fromBlock + LOG_BLOCK_RANGE;
    ranges.push({
      fromBlock,
      toBlock: candidateEnd < latestBlock ? candidateEnd : latestBlock,
    });
  }

  for (const { fromBlock, toBlock } of ranges) {
    const logs = await withLogRetry(() =>
      client.getLogs({
        address: collection.address,
        event: transferEvent,
        fromBlock,
        toBlock,
      }),
    );

    for (const log of logs) {
      const tokenId = log.args.tokenId;
      if (tokenId === undefined) continue;

      if (log.args.from?.toLowerCase() === wallet) owned.delete(tokenId);
      if (log.args.to?.toLowerCase() === wallet) owned.add(tokenId);
    }

    await pause(LOG_REQUEST_PAUSE_MS);
  }

  return sortTokenIds([...owned]);
}
type OwnershipSnapshot = {
  chainId: number;
  blockNumber: string;
  contracts: Record<string, Record<string, number[]>>;
};

async function loadOwnershipSnapshot(
  url: string,
  contract: Address,
  wallet: string,
) {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error("Inventory snapshot is unavailable.");

  const snapshot = (await response.json()) as OwnershipSnapshot;
  if (snapshot.chainId !== activeInventoryChainId) {
    throw new Error("Inventory snapshot is for the wrong chain.");
  }

  const contractOwnership = snapshot.contracts[contract.toLowerCase()];
  if (!contractOwnership) {
    throw new Error("Inventory snapshot does not match the active contracts.");
  }
  const tokenIds = contractOwnership[wallet]?.map(BigInt) ?? [];

  return {
    blockNumber: BigInt(snapshot.blockNumber),
    tokenIds,
  };
}
async function withLogRetry<T>(request: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < LOG_REQUEST_RETRIES; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (attempt === LOG_REQUEST_RETRIES - 1) break;
      await pause(LOG_REQUEST_PAUSE_MS * 2 ** attempt);
    }
  }

  throw lastError;
}

function pause(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
function sortTokenIds(tokenIds: readonly bigint[]) {
  return [...tokenIds].sort((left, right) => Number(left - right));
}
