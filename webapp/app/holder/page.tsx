import type { Metadata } from "next";
import { Suspense } from "react";
import { PageIntro } from "@/components/site/PageIntro";
import { StageGate } from "@/components/site/StageGate";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { MigrationWorkbench } from "@/components/wallet/MigrationWorkbench";
import { HolderSection } from "@/components/holders/HolderSection";
import { stageConfig } from "@/lib/stage";

export const metadata: Metadata = {
  title: "Holder app",
};

export default function HolderPage() {
  return (
    <>
      <PageIntro
        tone="amber"
        accent="green"
        title="Your xPunks, onchain."
        lead="Connect your wallet to see which xPunks you hold and which have already moved. When mainnet is live, you migrate them here. The holder programmes from XIP 25 also open from this page."
      >
        <ButtonLink href="/migration">Read XIP 24 and XIP 25</ButtonLink>
      </PageIntro>
      <section className="content-band migration-preview">
        {stageConfig.migrationEnabled ? (
          <Suspense fallback={null}>
            <MigrationWorkbench />
          </Suspense>
        ) : (
          <StageGate
            title="Migration opens after mainnet deployment."
            ctaHref="/migration#timeline"
            ctaLabel="See the execution path"
          >
            The onchain contract is being verified and prepared for mainnet. When
            migration goes live, you will retire your legacy xPunk here and mint
            the same-numbered onchain version. Nothing to do yet.
          </StageGate>
        )}
      </section>
      <section className="content-band migration-copy-grid">
        <article>
          <h2>Same punk, stronger storage.</h2>
          <p>
            The artwork and identity are preserved. What changes is where the
            collection lives: the new contract generates the punk directly from
            onchain data.
          </p>
        </article>
        <article>
          <h2>Approval is not migration.</h2>
          <p>
            Approval only lets the migration contract move selected legacy
            xPunks when you later choose to migrate. The burn-to-mint step is
            the irreversible transaction.
          </p>
        </article>
      </section>
      <div className="pillar-sub green">
        <HolderSection />
      </div>
    </>
  );
}
