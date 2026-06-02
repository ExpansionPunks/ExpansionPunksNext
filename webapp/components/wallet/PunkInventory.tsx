"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAccount, useSwitchChain } from "wagmi";
import { usePunkInventory } from "@/components/wallet/usePunkInventory";
import { activeInventoryChainId } from "@/lib/collection-contracts";

const CARD_MIN_WIDTH = 126;
const CARD_EXTRA_HEIGHT = 69;
const GRID_GAP = 12;
const MAX_GALLERY_HEIGHT = 526;
const OVERSCAN_ROWS = 1;

export function PunkInventory() {
  const { chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const legacy = usePunkInventory("legacy");
  const current = usePunkInventory("current");
  const correctWalletChain = chainId === activeInventoryChainId;

  return (
    <div className="inventory-groups">
      <p className="testnet-banner">Sepolia testnet inventory</p>
      {!correctWalletChain ? (
        <div className="inventory-network">
          <strong>Reading testnet holdings</strong>
          <p>
            Inventory is loaded from Sepolia. Switch your wallet to Sepolia before
            approving or migrating a token.
          </p>
          <div className="inventory-network-actions">
            <button type="button" disabled={isPending} onClick={() => switchChain({ chainId: activeInventoryChainId })}>
              Switch to Sepolia
            </button>
          </div>
        </div>
      ) : null}
      <InventoryGroup
        label="Onchain test xPunks"
        detail="Tokens already migrated into the Sepolia onchain contract."
        tokenIds={current.tokenIds}
        loading={current.isLoading}
        error={current.isError}
      />
      <InventoryGroup
        label="Legacy test xPunks"
        detail="Eligible source tokens awaiting migration."
        tokenIds={legacy.tokenIds}
        loading={legacy.isLoading}
        error={legacy.isError}
        migrate
      />
    </div>
  );
}

type InventoryGroupProps = {
  detail: string;
  error: boolean;
  label: string;
  loading: boolean;
  migrate?: boolean;
  tokenIds: readonly bigint[];
};

function InventoryGroup({
  detail,
  error,
  label,
  loading,
  migrate = false,
  tokenIds,
}: InventoryGroupProps) {
  const [filter, setFilter] = useState("");
  const [sortDirection, setSortDirection] = useState<"ascending" | "descending">("ascending");
  const deferredFilter = useDeferredValue(filter.trim().replace(/^#/, ""));
  const matchingTokenIds = useMemo(() => {
    const matching = deferredFilter
      ? tokenIds.filter((tokenId) => tokenId.toString().includes(deferredFilter))
      : [...tokenIds];

    return sortDirection === "descending" ? matching.reverse() : matching;
  }, [deferredFilter, sortDirection, tokenIds]);

  return (
    <div className="inventory-group">
      <InventoryHeading label={label} detail={detail} count={loading ? null : tokenIds.length} />
      {loading ? <p className="inventory-state">Loading held tokens...</p> : null}
      {error ? <p className="inventory-state error">Inventory could not be read from this network.</p> : null}
      {!loading && !error && tokenIds.length === 0 ? (
        <p className="inventory-state">No tokens found in this collection.</p>
      ) : null}
      {tokenIds.length > 0 ? (
        <>
          <div className="inventory-tools">
            <label>
              <span>Find punk</span>
              <input
                type="search"
                inputMode="numeric"
                placeholder="Token ID"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </label>
            <label>
              <span>Sort</span>
              <select
                value={sortDirection}
                onChange={(event) => setSortDirection(event.target.value as "ascending" | "descending")}
              >
                <option value="ascending">ID: Low to high</option>
                <option value="descending">ID: High to low</option>
              </select>
            </label>
            <p className="inventory-results">
              {matchingTokenIds.length} of {tokenIds.length}
            </p>
          </div>
          {matchingTokenIds.length > 0 ? (
            <VirtualTokenGrid
              key={`${deferredFilter}-${sortDirection}`}
              tokenIds={matchingTokenIds}
              migrate={migrate}
            />
          ) : (
            <p className="inventory-state">No held punks match that token ID.</p>
          )}
        </>
      ) : null}
    </div>
  );
}

function InventoryHeading({ label, detail, count }: { label: string; detail: string; count: number | null }) {
  return (
    <div className="inventory-heading">
      <div>
        <h3>{label}</h3>
        <p>{detail}</p>
      </div>
      {count === null ? null : <span>{count}</span>}
    </div>
  );
}

function VirtualTokenGrid({ tokenIds, migrate }: { tokenIds: readonly bigint[]; migrate: boolean }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(CARD_MIN_WIDTH);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const updateSize = () => {
      setWidth(viewport.clientWidth);
    };
    const observer = new ResizeObserver(updateSize);

    updateSize();
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  const availableWidth = Math.max(CARD_MIN_WIDTH, width);
  const columnCount = Math.max(1, Math.floor((availableWidth + GRID_GAP) / (CARD_MIN_WIDTH + GRID_GAP)));
  const cardWidth = (availableWidth - GRID_GAP * (columnCount - 1)) / columnCount;
  const cardHeight = Math.round(cardWidth + CARD_EXTRA_HEIGHT);
  const rowHeight = cardHeight + GRID_GAP;
  const rowCount = Math.ceil(tokenIds.length / columnCount);
  // TanStack Virtual intentionally manages imperative scroll measurements.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN_ROWS,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowHeight, rowVirtualizer]);

  const totalHeight = Math.max(cardHeight, rowVirtualizer.getTotalSize() - GRID_GAP);
  const galleryHeight = Math.min(MAX_GALLERY_HEIGHT, totalHeight);

  return (
    <div ref={viewportRef} className="virtual-token-viewport" style={{ height: `${galleryHeight}px` }}>
      <div className="virtual-token-stage" style={{ height: `${totalHeight}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowTokenIds = tokenIds.slice(
            virtualRow.index * columnCount,
            (virtualRow.index + 1) * columnCount,
          );
          const rowStyle = {
            "--token-card-height": `${cardHeight}px`,
            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            transform: `translateY(${virtualRow.start}px)`,
          } as CSSProperties;

          return (
            <div key={virtualRow.key} className="token-grid virtual-token-row" style={rowStyle}>
              {rowTokenIds.map((tokenId) => (
                <TokenCard key={tokenId.toString()} tokenId={tokenId} migrate={migrate} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TokenCard({ tokenId, migrate }: { tokenId: bigint; migrate: boolean }) {
  const id = tokenId.toString();
  return (
    <article className="token-card">
      <Image src={`/art/punk/${id}`} width={126} height={126} alt={`ExpansionPunk #${id}`} />
      <strong>#{id}</strong>
      {migrate ? (
        <Link href={`/migration?punk=${id}`}>Migrate</Link>
      ) : (
        <span>Onchain</span>
      )}
    </article>
  );
}
