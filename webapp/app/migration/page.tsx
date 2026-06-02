import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { PillarLinks } from "@/components/site/PillarLinks";
import { GovernanceSection } from "@/components/xips/GovernanceSection";

export const metadata: Metadata = {
  title: "Migration",
};

export default function MigrationPage() {
  return (
    <>
      <PageIntro
        tone="amber"
        accent="magenta"
        title="Move your punk onchain, claim part of the DAO."
        lead="Two votes passed in May 2026. XIP 24 moves every xPunk into a new onchain contract. XIP 25 winds the DAO down and returns the treasury to holders through rewards, grants and raffles. This is where both play out."
      >
        <button className="button secondary is-pending" type="button" disabled aria-disabled="true">
          Migrate your xPunks
        </button>
        <span className="intro-cta-hint">Opens after mainnet deployment</span>
      </PageIntro>
      <GovernanceSection />
      <PillarLinks current="/migration" />
    </>
  );
}
