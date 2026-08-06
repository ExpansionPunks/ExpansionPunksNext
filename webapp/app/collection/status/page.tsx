import type { Metadata } from "next";
import { Suspense } from "react";
import { PageIntro } from "@/components/site/PageIntro";
import { StageGate } from "@/components/site/StageGate";
import { CollectionStatus } from "@/components/collection/CollectionStatus";
import { rewardsEnabled } from "@/lib/rewards-contracts";

export const metadata: Metadata = {
  title: "Collection status",
};

export default function CollectionStatusPage() {
  return (
    <>
      <PageIntro
        tone="amber"
        accent="plum"
        title="Collection status"
        lead="Migration progress across all 10,000 xPunks, plus the wind-down timeline and latch/sweep controls for the rewards programme."
      />
      <section className="content-band">
        {rewardsEnabled ? (
          <Suspense fallback={null}>
            <CollectionStatus />
          </Suspense>
        ) : (
          <StageGate
            title="Collection stats are not available yet."
            ctaHref="/migration"
            ctaLabel="Read about the migration"
          >
            The rewards contract has not been deployed for this stage. Collection-wide
            stats and the phase clock will appear here once the contract is live.
          </StageGate>
        )}
      </section>
    </>
  );
}
