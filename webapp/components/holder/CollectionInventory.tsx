"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { OnchainPunkSvg } from "@/components/art/OnchainPunkSvg";
import { ClickableReformPunk } from "@/components/reform/ClickableReformPunk";
import { MigrationWizard } from "@/components/holder/MigrationWizard";
import { migrateCtaLabel } from "@/components/holder/migrate-cta-label";
import { MIGRATION_CAP } from "@/components/holder/migration-selection";
import { Modal } from "@/components/ui/Modal";
import { WalletButton } from "@/components/wallet/WalletButton";
import { usePunkInventory } from "@/components/wallet/usePunkInventory";
import { useViewerWallet } from "@/components/wallet/useViewerWallet";
import { stageConfig } from "@/lib/stage";

const SHELF_LIMIT = 12;

function countLabel(count: number) {
  return count === 1 ? "1 xPunk" : `${count} xPunks`;
}

export function CollectionInventory() {
  const viewer = useViewerWallet();
  const {
    address,
    chainId,
    connector,
    hasViewer,
    isConnected,
    isReadOnlyViewer,
    status: walletStatus,
  } = viewer;
  const legacy = usePunkInventory("legacy");
  const onchain = usePunkInventory("current");
  const [modalOpen, setModalOpen] = useState(false);
  const [showAllOnchain, setShowAllOnchain] = useState(false);
  const [showAllLegacy, setShowAllLegacy] = useState(false);
  const closeModal = useCallback(() => setModalOpen(false), []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    console.info("[HolderDebug] wallet", JSON.stringify({
      address: address ?? null,
      chainId: chainId ?? null,
      connectorId: connector?.id ?? null,
      connectorName: connector?.name ?? null,
      hasViewer,
      isConnected,
      isReadOnlyViewer,
      status: walletStatus,
    }));
  }, [
    address,
    chainId,
    connector?.id,
    connector?.name,
    hasViewer,
    isConnected,
    isReadOnlyViewer,
    walletStatus,
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !hasViewer) return;

    console.info("[HolderDebug] inventory", JSON.stringify({
      address,
      legacy: {
        contract: legacy.collection?.address ?? null,
        count: legacy.tokenIds.length,
        error: legacy.error instanceof Error ? legacy.error.message : legacy.error ?? null,
        fetchStatus: legacy.fetchStatus,
        status: legacy.status,
        strategy: legacy.collection?.strategy ?? null,
      },
      onchain: {
        contract: onchain.collection?.address ?? null,
        count: onchain.tokenIds.length,
        error: onchain.error instanceof Error ? onchain.error.message : onchain.error ?? null,
        fetchStatus: onchain.fetchStatus,
        status: onchain.status,
        strategy: onchain.collection?.strategy ?? null,
      },
    }));
  }, [
    address,
    hasViewer,
    legacy.collection,
    legacy.error,
    legacy.fetchStatus,
    legacy.status,
    legacy.tokenIds.length,
    onchain.collection,
    onchain.error,
    onchain.fetchStatus,
    onchain.status,
    onchain.tokenIds.length,
  ]);

  const visibleOnchain = useMemo(
    () => showAllOnchain ? onchain.tokenIds : onchain.tokenIds.slice(0, SHELF_LIMIT),
    [onchain.tokenIds, showAllOnchain],
  );
  const visibleLegacy = useMemo(
    () => showAllLegacy ? legacy.tokenIds : legacy.tokenIds.slice(0, SHELF_LIMIT),
    [legacy.tokenIds, showAllLegacy],
  );

  if (!hasViewer) {
    return (
      <section className="holder-welcome">
        <div className="holder-welcome-punk">
          <ClickableReformPunk tokenId={18108} />
        </div>
        <div>
          <h2>Bring your collection into view.</h2>
          <p>Connect the wallet that holds your ExpansionPunks. Nothing is signed until you choose an action.</p>
          <WalletButton appearance="panel" />
        </div>
      </section>
    );
  }

  const legacyCount = legacy.tokenIds.length;
  const onchainCount = onchain.tokenIds.length;
  const loading = legacy.isLoading || onchain.isLoading;
  const inventoryError = legacy.error ?? onchain.error;

  if (inventoryError) {
    return (
      <section className="holder-inventory-error" role="alert">
        <strong>We could not read this wallet&apos;s xPunks.</strong>
        <p>The {stageConfig.chainLabel} inventory request failed. Refresh the page to try again.</p>
      </section>
    );
  }

  return (
    <div className="collection-workspace">
      <div className="collection-workspace-head">
        <div>
          <span>Your collection</span>
          <h2>{loading ? "Finding your xPunks..." : countLabel(onchainCount + legacyCount)}</h2>
        </div>
        {!loading ? (
          <p>
            <strong>{onchainCount}</strong> onchain
            <span aria-hidden="true">/</span>
            <strong>{legacyCount}</strong> ready to migrate
          </p>
        ) : null}
      </div>

      {isReadOnlyViewer ? (
        <p className="holder-dev-viewer">
          Development rehearsal. Transactions use the disposable Sepolia test wallet.
        </p>
      ) : null}

      <section className="punk-shelf onchain">
        <div className="punk-shelf-head">
          <div>
            <span className="punk-shelf-status">Onchain</span>
            <h3>ExpansionPunks Next</h3>
          </div>
          <strong>{onchainCount}</strong>
        </div>

        {onchain.isLoading ? (
          <p className="inventory-empty">Loading onchain xPunks...</p>
        ) : onchainCount === 0 ? (
          <p className="punk-shelf-empty">Your onchain collection will appear here after migration.</p>
        ) : (
          <>
            <ul className="inventory-list">
              {visibleOnchain.map((id) => (
                <li key={id.toString()} className="inventory-card">
                  <OnchainPunkSvg tokenId={Number(id)} />
                  <span>#{id.toString()}</span>
                </li>
              ))}
            </ul>
            {onchainCount > SHELF_LIMIT ? (
              <button
                className="punk-shelf-more"
                type="button"
                onClick={() => setShowAllOnchain((value) => !value)}
              >
                {showAllOnchain ? "Show less" : `Show all ${onchainCount}`}
              </button>
            ) : null}
          </>
        )}
      </section>

      {!legacy.isLoading && legacyCount > 0 ? (
        <section className="punk-shelf legacy">
          <div className="punk-shelf-head">
            <div>
              <span className="punk-shelf-status">Legacy</span>
              <h3>Ready to move onchain</h3>
            </div>
            {isConnected || isReadOnlyViewer ? (
              <button className="button dark" type="button" onClick={() => setModalOpen(true)}>
                {migrateCtaLabel(legacyCount, MIGRATION_CAP)}
              </button>
            ) : (
              <WalletButton appearance="panel" />
            )}
          </div>

          <ul className="inventory-list">
            {visibleLegacy.map((id) => (
              <li key={id.toString()} className="inventory-card">
                <Image
                  src={`/art/punk/${id}`}
                  width={96}
                  height={96}
                  alt={`Legacy xPunk #${id}`}
                />
                <span>#{id.toString()}</span>
              </li>
            ))}
          </ul>
          {legacyCount > SHELF_LIMIT ? (
            <button
              className="punk-shelf-more"
              type="button"
              onClick={() => setShowAllLegacy((value) => !value)}
            >
              {showAllLegacy ? "Show less" : `Show all ${legacyCount}`}
            </button>
          ) : null}
        </section>
      ) : null}

      {!loading && onchainCount === 0 && legacyCount === 0 ? (
        <p className="holder-no-punks">No ExpansionPunks were found in this wallet.</p>
      ) : null}

      <Modal open={modalOpen} onClose={closeModal} title="Migrate your xPunks">
        <MigrationWizard onClose={closeModal} />
      </Modal>
    </div>
  );
}