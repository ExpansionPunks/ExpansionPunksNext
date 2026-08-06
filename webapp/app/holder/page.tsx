import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StageGate } from "@/components/site/StageGate";
import { CollectionInventory } from "@/components/holder/CollectionInventory";
import { RewardsSection } from "@/components/holder/RewardsSection";
import { stageConfig } from "@/lib/stage";

export const metadata: Metadata = {
  title: "Your xPunks",
};

const closedGate = stageConfig.stage === "testnet"
  ? {
      title: "The fresh Sepolia rehearsal is not configured.",
      body: "Wallet and migration tools stay closed until every remediated testnet contract and its deployment block are configured.",
    }
  : {
      title: "Migration opens after mainnet deployment.",
      body: "The collection is in final preparation. Your holder app will open here when the verified migration contract is live.",
    };

export default function HolderPage() {
  return (
    <main className="holder-app">
      <header className="holder-app-intro">
        <div>
          <span className="holder-app-kicker">Holder app</span>
          <h1>Your xPunks.</h1>
          <p>See what you hold, move legacy punks onchain, and collect your rewards.</p>
        </div>
        <Link href="/migration">How migration works</Link>
      </header>

      {stageConfig.migrationEnabled ? (
        <section className="holder-workspace">
          <Suspense fallback={<p className="holder-loading">Loading your collection...</p>}>
            <CollectionInventory />
          </Suspense>

          <details className="holder-drawer" id="rewards">
            <summary>
              <span>
                <strong>Rewards</strong>
                <small>Base payments and participation claims</small>
              </span>
              <span className="holder-drawer-action">Open</span>
            </summary>
            <Suspense fallback={<p className="holder-loading">Loading rewards...</p>}>
              <RewardsSection />
            </Suspense>
          </details>

          <nav className="holder-utility-links" aria-label="More holder tools">
            <Link href="/collection/status">
              <span>Collection status</span>
              <small>Follow the move onchain</small>
            </Link>
            <Link href="/migration/verify">
              <span>Verify the artwork</span>
              <small>Inspect the public proof</small>
            </Link>
            <Link href="/xips">
              <span>XIP 24 + 25</span>
              <small>Read the full record</small>
            </Link>
          </nav>
        </section>
      ) : (
        <section className="holder-workspace">
          <StageGate
            title={closedGate.title}
            ctaHref="/migration"
            ctaLabel="See where we are"
          >
            {closedGate.body}
          </StageGate>
        </section>
      )}
    </main>
  );
}