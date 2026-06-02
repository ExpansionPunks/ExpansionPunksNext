"use client";

import { useAccount } from "wagmi";
import { StageGate } from "@/components/site/StageGate";
import { PunkImage } from "@/components/ui/PunkImage";
import { PunkInventory } from "@/components/wallet/PunkInventory";
import { WalletButton } from "@/components/wallet/WalletButton";
import { stageConfig } from "@/lib/stage";
import { formatWalletAddress } from "@/lib/wallet-config";

export function HolderWalletPanel() {
  const { address, chain, isConnected } = useAccount();

  if (!stageConfig.walletEnabled) {
    return (
      <div className="wallet-panel">
        <div className="wallet-top">
          <h2>My xPunks</h2>
        </div>
        <StageGate
          title="Holder tools open with migration."
          ctaHref="/xips#timeline"
          ctaLabel="See the execution path"
        >
          When migration goes live you will connect your wallet here to see the
          xPunks you hold, what can migrate, and what has already moved onchain.
        </StageGate>
        <div className="preview-label">Artwork preview</div>
        <div className="preview-row">
          <PunkImage tokenId={10031} decorative />
          <PunkImage tokenId={18108} decorative />
          <PunkImage tokenId={11177} decorative />
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-panel">
      <div className="wallet-top">
        <h2>My xPunks</h2>
        <span className={`connection-state ${isConnected ? "connected" : ""}`}>
          {address ? formatWalletAddress(address) : "Wallet disconnected"}
        </span>
      </div>
      <p className="wallet-guidance">
        {isConnected
          ? `Connected through ${chain?.name ?? "your wallet"}. Reading Sepolia rehearsal holdings.`
          : "Connect a wallet to find eligible xPunks and prepare your holder view."}
      </p>
      {isConnected ? (
        <PunkInventory />
      ) : (
        <>
          <WalletButton appearance="panel" />
          <div className="preview-label">Artwork preview</div>
          <div className="preview-row">
            <PunkImage tokenId={10031} decorative />
            <PunkImage tokenId={18108} decorative />
            <PunkImage tokenId={11177} decorative />
          </div>
        </>
      )}
    </div>
  );
}
