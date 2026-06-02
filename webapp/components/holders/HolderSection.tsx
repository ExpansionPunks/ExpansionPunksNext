import { HolderWalletPanel } from "@/components/wallet/HolderWalletPanel";

export function HolderSection() {
  return (
    <>
      <section className="content-band holder-preview">
        <HolderWalletPanel />
        <div className="holder-actions">
          <article>
            <h2>Artwork</h2>
            <p>Download clean images, compare renders, and keep token IDs easy to reference.</p>
          </article>
          <article>
            <h2>Grants</h2>
            <p>Submit holder projects and follow awards during the 12-month programme.</p>
          </article>
          <article>
            <h2>Stewardship</h2>
            <p>Request CP #2321 delegation for eligible community moments and events.</p>
          </article>
        </div>
      </section>
      <section className="content-band holder-copy-grid">
        <article>
          <h2>Holder actions, not hype.</h2>
          <p>
            This area should answer practical questions first: which contract
            owns this punk, whether it can migrate, whether it already moved,
            and what community programmes are open.
          </p>
        </article>
        <article>
          <h2>Sepolia first.</h2>
          <p>
            The connected wallet tools currently rehearse the flow on Sepolia.
            Mainnet addresses and final verification reports will be published
            before the live migration.
          </p>
        </article>
      </section>
      <section className="content-band support-line" id="support">
        <h2>Holder support</h2>
        <p>
          Hands-on launch support will be available through the four-week launch
          support period once migration opens.
        </p>
      </section>
    </>
  );
}
