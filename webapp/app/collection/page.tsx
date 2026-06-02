import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { PillarLinks } from "@/components/site/PillarLinks";
import { PunkImage } from "@/components/ui/PunkImage";
import { featuredPunks, punkTypes } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Collection",
};

export default function CollectionPage() {
  return (
    <>
      <PageIntro
        tone="amber"
        accent="blue"
        title="Ten thousand punks, headed fully onchain."
        lead="A more representative expansion of the Punkverse, built to the original's logic and now moving onchain, where the art needs nothing but Ethereum to exist. Browse it, and see how it is made."
      />

      <section className="content-band manifesto">
        <h2>A punk for everyone the first 10,000 left out.</h2>
        <p>
          The original Punkverse was 10,000 faces with not much range. In 2021 we
          made 10,000 more, built to the same logic, for the people it skipped.
        </p>
        <p className="manifesto-note">
          It locked traits by gender. We opened them up. Below: men in tiaras and
          lipstick, women in top hats, a few rare faces in hats the original
          never gave them, and the one punk wearing all eight traits.
        </p>
        <div className="explorer-grid">
          {featuredPunks.map(({ tokenId, tag }) => (
            <article key={tokenId}>
              <PunkImage tokenId={tokenId} />
              <div className="punk-meta">
                <strong>#{tokenId}</strong>
                <span className="punk-tag">{tag}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="content-band rarity-section">
        <div className="band-head">
          <h2>Six types, and the hunt for the rare ones</h2>
          <p>
            Like the punks they expand, xPunks come in types. The fewer there
            are, the harder they are to find.
          </p>
        </div>
        <ol className="rarity-ladder">
          {punkTypes.map((type) => (
            <li
              className="rarity-tier"
              data-rare={type.rare ? "" : undefined}
              key={type.name}
            >
              <strong>{type.count.toLocaleString()}</strong>
              <span className="tier-name">{type.name}</span>
              {type.note ? <span className="tier-note">{type.note}</span> : null}
            </li>
          ))}
        </ol>
        <div className="rarity-grails">
          <p>
            If those numbers feel familiar, that is on purpose. CryptoPunks has 9
            aliens, 24 apes, and 88 zombies. We expanded the Punkverse without
            breaking its math, then added a type it never had.
          </p>
          <p>
            Attribute counts have their own extremes. Most xPunks wear two or
            three traits. Two wear none at all, and exactly one carries eight.
            Those edges are what collectors chase.
          </p>
        </div>
      </section>

      <section className="content-band collection-proof">
        <div className="band-head">
          <h2>The parts and the recipe</h2>
          <p>
            We do not store 10,000 finished images. The contract holds the
            individual pixel traits and the recipe for each token, then assembles
            the punk when a wallet or marketplace asks for it.
          </p>
        </div>
        <p className="system-note">
          To make them sit beside the originals, we reverse-engineered how
          CryptoPunks are composed and ran around 100 million checks while
          generating the set, so no xPunk landed as a copy of one that already
          existed. The payoff is permanence: every trait, plus the recipe for all
          10,000 punks, fits in about 103 KB of Ethereum storage, with no IPFS
          and no server to keep alive.
        </p>
        <dl className="proof-stats">
          <div>
            <dt>24x24</dt>
            <dd>original pixel grid</dd>
          </div>
          <div>
            <dt>199</dt>
            <dd>trait layers, 11 categories</dd>
          </div>
          <div>
            <dt>126</dt>
            <dd>trait layer colors</dd>
          </div>
          <div>
            <dt>4.9 KB</dt>
            <dd>trait art, from 112 KB of raw pixels</dd>
          </div>
        </dl>
      </section>

      <section className="content-band collection-close">
        <div className="band-head">
          <h2>Find one that is yours</h2>
          <p>
            Every xPunk keeps its number through migration. The legacy collection
            trades on the secondary market today, and the onchain edition arrives
            when migration opens. Either way, #12345 stays #12345.
          </p>
        </div>
      </section>

      <PillarLinks current="/collection" />
    </>
  );
}
