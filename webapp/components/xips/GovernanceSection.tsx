import { StatusLine } from "@/components/site/StatusLine";
import { ExecutionMap } from "@/components/xips/ExecutionMap";
import { discordDiscussionLinks, snapshotLinks, verifyResult } from "@/lib/site-data";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function GovernanceSection() {
  return (
    <>
      <section className="content-band xip-summary">
        <article className="proposal-detail xip24" id="xip24">
          <h2>XIP 24</h2>
          <strong>Onchain migration</strong>
          <p>
            XIP 24 moves ExpansionPunks from external artwork infrastructure into
            a new official onchain contract. Holders retire the legacy token and
            receive the same numbered xPunk from the new contract.
          </p>
          <StatusLine status="current">Verified on testnet; preparing for mainnet</StatusLine>
          <div className="proposal-links">
            <a href={snapshotLinks.xip24} rel="noreferrer" target="_blank">
              Snapshot proposal
            </a>
            <a href={discordDiscussionLinks.xip24} rel="noreferrer" target="_blank">
              Discord discussion
            </a>
          </div>
        </article>
        <article className="proposal-detail xip25" id="xip25">
          <h2>XIP 25</h2>
          <strong>DAO wind-down</strong>
          <p>
            XIP 25 turns the remaining treasury into a final public programme:
            one-time community rewards, 12 months of grants, DAO-owned xPunk
            raffles and stewardship of CryptoPunk #2321.
          </p>
          <StatusLine status="done">Stewardship path approved</StatusLine>
          <div className="proposal-links">
            <a href={snapshotLinks.xip25} rel="noreferrer" target="_blank">
              Snapshot proposal
            </a>
            <a href={discordDiscussionLinks.xip25} rel="noreferrer" target="_blank">
              Discord discussion
            </a>
          </div>
        </article>
      </section>
      <section className="content-band xip-story">
        <div className="band-head">
          <h2>What it means</h2>
          <p>
            This is not a new mint. It is the official migration path for
            existing xPunks, paired with a deliberate ending for active DAO
            administration.
          </p>
        </div>
        <div className="xip-chapters">
          <article>
            <h3>The art lasts</h3>
            <p>
              The new collection stores the parts and the recipe on Ethereum,
              then assembles the punk when a wallet or marketplace asks for it.
            </p>
          </article>
          <article>
            <h3>Holders migrate</h3>
            <p>
              Existing holders retire a legacy xPunk and receive its onchain
              counterpart with the same ID. The identity stays; the storage changes.
            </p>
          </article>
          <article>
            <h3>The DAO closes well</h3>
            <p>
              Rewards, grants, holder raffles, final accounting and CP #2321
              stewardship carry the community into its next form.
            </p>
          </article>
        </div>
      </section>
      <section className="execution" id="timeline">
        <div className="content-band execution-head">
          <div className="band-head">
            <h2>Where we are now</h2>
            <p>
              We have reproduced all 10k onchain on testnet and verified every
              pixel against the originals. Now we are in preflight — audit and
              mainnet rehearsal — before deploy and the published proof.
            </p>
          </div>
        </div>
        <div className="content-band execution-frame">
          <ExecutionMap />
        </div>
      </section>
      <section className="content-band verify-teaser" id="verification">
        <div className="band-head">
          <h2>Proof the art survives</h2>
          <p>
            We rebuilt all {verifyResult.total.toLocaleString()} punks from the onchain
            contract and compared every pixel against the originals.{" "}
            {verifyResult.exact.toLocaleString()} match exactly, the rest differ only by
            imperceptible rounding, and none differ structurally.
          </p>
        </div>
        <ButtonLink href="/migration/verify" variant="primary">
          See the verification
        </ButtonLink>
      </section>
      <section className="content-band contract-placeholder" id="contracts">
        <h2>Contracts and proofs</h2>
        <p>
          Deployment addresses, verified source links and reproducible artwork
          evidence will appear here as the project clears mainnet preflight.
        </p>
        <div className="proof-points">
          <span>Renderer output</span>
          <span>Source verification</span>
          <span>Lock evidence</span>
          <span>Final accounting</span>
        </div>
      </section>
    </>
  );
}
