import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { PillarLinks } from "@/components/site/PillarLinks";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { stageConfig } from "@/lib/stage";

export const metadata: Metadata = {
  title: "Migration",
};

function holderCta() {
  if (stageConfig.stage === "testnet" && stageConfig.migrationEnabled) {
    return "Open the Sepolia rehearsal";
  }
  if (stageConfig.stage === "testnet") return "See rehearsal status";
  if (stageConfig.stage === "mainnet" && stageConfig.migrationEnabled) return "Migrate my xPunks";
  return "Open the holder app";
}

export default function MigrationPage() {
  return (
    <>
      <PageIntro
        tone="amber"
        accent="magenta"
        title="Move your xPunks onchain."
        lead="The artwork and token IDs stay the same. Holders retire each legacy xPunk and receive its fully onchain counterpart through the official migration."
      >
        <ButtonLink href="/holder">{holderCta()}</ButtonLink>
      </PageIntro>

      <section className="content-band migration-brief" id="timeline">
        <div className="band-head">
          <h2>Where we are</h2>
          <p>
            The artwork and initial migration flow were proven on Sepolia. A fresh
            rehearsal of the remediated release is part of the final mainnet preflight.
          </p>
        </div>
        <div className="migration-brief-track">
          <article className="done">
            <span>Complete</span>
            <h3>Rebuild all 10,000</h3>
            <p>Every xPunk was reproduced and checked against the original art.</p>
          </article>
          <article className="current">
            <span>Now</span>
            <h3>Mainnet preflight</h3>
            <p>Audit, deployment rehearsal, final addresses and published proof.</p>
          </article>
          <article>
            <span>Next</span>
            <h3>Migration opens</h3>
            <p>Connect, review, approve and migrate from the holder app.</p>
          </article>
        </div>
      </section>

      <section className="content-band migration-copy-grid">
        <article>
          <h2>What changes</h2>
          <p>
            The legacy token is permanently retired. A new onchain xPunk with the
            same ID is minted to the wallet that migrates it.
          </p>
        </article>
        <article>
          <h2>What you do</h2>
          <p>
            Connect the wallet holding your legacy xPunks, choose the IDs you want
            to move, review the transaction, then confirm it in your wallet.
          </p>
        </article>
      </section>

      <section className="content-band migration-deep-links">
        <div>
          <h2>Want the full record?</h2>
          <p>The votes, execution timeline, artwork proof and deployment evidence live one level deeper.</p>
        </div>
        <div className="migration-deep-actions">
          <ButtonLink href="/xips" variant="secondary">Read XIP 24 and XIP 25</ButtonLink>
          <ButtonLink href="/migration/verify" variant="primary">See the artwork proof</ButtonLink>
        </div>
      </section>

      <PillarLinks current="/migration" />
    </>
  );
}
