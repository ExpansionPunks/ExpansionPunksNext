import { StatusLine } from "@/components/site/StatusLine";
import { ExecutionMap } from "@/components/xips/ExecutionMap";
import { discordDiscussionLinks, snapshotLinks } from "@/lib/site-data";

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
          <StatusLine status="current">Verify 10k is in progress</StatusLine>
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
              Verification is underway now. Migration begins only after preflight,
              mainnet deployment and published proof are complete.
            </p>
          </div>
        </div>
        <div className="content-band execution-frame">
          <ExecutionMap />
        </div>
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
