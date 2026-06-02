import type { Metadata } from "next";
import { PillarLinks } from "@/components/site/PillarLinks";
import { PunkImage } from "@/components/ui/PunkImage";

export const metadata: Metadata = {
  title: "The story so far",
};

export default function StoryPage() {
  return (
    <>
      <section className="story-museum-hero">
        <div className="story-hero-copy">
          <h1>A more representative Punkverse, and where it goes next.</h1>
          <p>
            ExpansionPunks started in 2021 as a broader, more representative
            expansion of the Punkverse. We became a community, then a DAO. After
            a full market cycle and a few rough patches, we chose to make the art
            permanent instead of dependent.
          </p>
        </div>
        <div className="story-hero-wall" aria-label="ExpansionPunks artwork">
          <figure className="wall-piece large">
            <PunkImage tokenId={18108} priority />
            <figcaption>
              <strong>Now</strong>
              <span>Verify first, migrate second.</span>
            </figcaption>
          </figure>
          <figure className="wall-piece">
            <PunkImage tokenId={10006} priority />
            <figcaption>
              <strong>2021</strong>
              <span>A broader Punkverse.</span>
            </figcaption>
          </figure>
          <figure className="wall-ticket">
            <strong>The throughline</strong>
            <span>Same punk. Same ID. Stronger storage.</span>
          </figure>
        </div>
      </section>

      <section className="content-band story-feature">
        <div className="story-copy">
          <h2>Why we made xPunks</h2>
          <p>
            CryptoPunks set the template for what a profile-picture collection
            could be. The original 10,000 were also a narrow slice of who was
            actually in the room. In 2021 we built ExpansionPunks to widen that
            picture: 10,000 new punks with a broader range of faces and
            identities than the set they grew out of.
          </p>
          <p>
            We didn&rsquo;t want a quick knock-off. The art was built to stand
            next to the original on its own terms. We reverse-engineered how
            CryptoPunks were composed and ran around 100 million comparisons
            while generating the collection, so no xPunk accidentally landed as a
            copy of one that already existed.
          </p>
          <p>
            2021 was full of &ldquo;expansion&rdquo; drops that were mostly cash
            grabs. We were trying to do the opposite, and we wanted it to hold up
            later.
          </p>
        </div>
        <div className="portrait-pair">
          <PunkImage tokenId={10006} />
          <PunkImage tokenId={10237} />
        </div>
      </section>

      <section className="content-band story-block">
        <h2>Why we formed a DAO</h2>
        <p>
          Holding an xPunk was supposed to mean more than owning an image, so we
          handed the collection to its holders. ExpansionDAO put the people who
          held the punks, not the founders, in charge of what happened next.
        </p>
        <p>
          We paid for it with royalties. An early vote raised the secondary
          royalty to 5% and sent all of it to the treasury, with the founders
          taking none. That gave the community an actual budget and actual
          choices.
        </p>
        <p>
          The choices said something. The DAO bought CryptoPunk #2321 to hold
          together, and it donated to OutRight Action International, an LGBTIQ
          rights group. We spent the treasury on things we believed in, which is
          rarer than it should be.
        </p>
      </section>

      <section className="content-band story-block">
        <h2>What happened after the sellout</h2>
        <p>
          The collection sold out. The market turned and the noise faded. That is
          where a lot of 2021 projects quietly ended.
        </p>
        <p>
          We didn&rsquo;t, though it wasn&rsquo;t clean. There were long quiet
          stretches. A handoff of project leadership stalled when the person who
          took it on walked away, and for a while almost nothing moved.
        </p>
        <p>
          The part that held was the unglamorous one. Governance kept running and
          the treasury stayed intact, CryptoPunk #2321 included. The DAO did the
          boring, important job of still being there when the hype wasn&rsquo;t.
        </p>
      </section>

      <section className="content-band story-feature">
        <div className="story-copy">
          <h2>Why we&rsquo;re moving onchain</h2>
          <p>
            Here is the catch we carried from day one: the punks were never fully
            onchain. The token lived on Ethereum. The artwork lived on IPFS,
            pinned through a service we paid to keep online.
          </p>
          <p>
            That worked until it didn&rsquo;t. Our traffic pushed past 150,000
            requests a month and started breaking our Pinata setup. The original
            contract has no way to change where the art is served from, so we
            couldn&rsquo;t just patch it. The permanence people assumed they
            owned actually depended on us keeping a bill paid.
          </p>
          <p>
            So we voted to fix it for real. XIP 24 passed 266 to 0: move the
            whole collection onchain, where each punk is generated from data
            stored on Ethereum and needs no server to stay alive.
          </p>
          <p>
            This is also why it didn&rsquo;t happen in 2021. Putting 10,000
            images onchain the obvious way costs a fortune. Making the art small
            enough to live on Ethereum and still render correctly took real work.
          </p>
        </div>
        <div className="portrait-pair">
          <PunkImage tokenId={12238} />
          <PunkImage tokenId={18108} />
        </div>
      </section>

      <section className="content-band story-block">
        <h2>Where this is going</h2>
        <p>
          Two votes set the direction. XIP 24 moves the art onchain. XIP 25 winds
          the DAO down on purpose, while it is still healthy, instead of letting
          it drift.
        </p>
        <p>
          Migration is burn-to-mint. You retire your legacy xPunk and receive the
          same-numbered punk from the new contract, with the art rendered
          straight from Ethereum. It is not live yet. We are verifying all 10,000
          renders first, and the public app currently runs against a Sepolia
          rehearsal. Verify first, migrate second.
        </p>
        <p>
          The wind-down turns what is left of the treasury into a final program:
          rewards for holders who migrate, a 12-month grants program for holder
          projects, and long-term stewardship of CryptoPunk #2321, held for at
          least three years with delegation access for community events. Given
          the choice, the DAO kept the punk rather than cashing it out, 139 votes
          to 84.
        </p>
        <p>
          None of this ends the collection or the community. It ends the part
          where a DAO has to actively run things. The punks outlive the admin.
        </p>
      </section>

      <PillarLinks current="/story" />
    </>
  );
}
