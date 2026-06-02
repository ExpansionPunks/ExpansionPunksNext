"use client";

import { useState } from "react";
import Link from "next/link";
import { PunkImage } from "@/components/ui/PunkImage";

const storyExhibits = [
  {
    id: "origin",
    accent: "blue",
    year: "2021",
    tokenId: 10006,
    label: "Artifact 01",
    title: "The missing faces",
    summary:
      "ExpansionPunks began with a simple observation: the Punkverse did not yet contain enough ways for people to recognize themselves.",
    detail:
      "The answer was not to replace CryptoPunks. It was to expand the world around them: more women, non-binary punks, broader skin-tone balance, and the same 24x24 visual language collectors already understood.",
    proof: ["10,000 xPunks", "IDs #10000-#19999", "A more representative Punkverse"],
  },
  {
    id: "proof",
    accent: "green",
    year: "Genesis work",
    tokenId: 12238,
    label: "Artifact 02",
    title: "The proof table",
    summary:
      "Before the collection could expand the Punkverse, the team had to understand its original rules.",
    detail:
      "The lore here is technical, but the feeling is simple: ExpansionPunks was built with respect for the source material. The trait logic, image language, and collision checks became part of the collection's credibility.",
    proof: ["100 million comparison checks", "Trait logic studied", "No replacement story"],
  },
  {
    id: "dao",
    accent: "magenta",
    year: "ExpansionDAO",
    tokenId: 18108,
    label: "Artifact 03",
    title: "The shared treasury",
    summary:
      "The collection became a DAO with a treasury, proposals, public votes, and a long memory.",
    detail:
      "That history was not spotless, which is exactly why it matters. The DAO made real choices, carried real assets, weathered quiet periods, and still reached a deliberate final vote.",
    proof: ["Treasury held", "Community stayed", "Governance left a record"],
  },
  {
    id: "winter",
    accent: "orange",
    year: "The hard stretch",
    tokenId: 11177,
    label: "Artifact 04",
    title: "Still here",
    summary:
      "The NFT market cooled. Many projects went silent. xPunks did not vanish.",
    detail:
      "The story worth telling is not that everything went perfectly. It is that the collection outlived any single operator, any one proposal, and the easy part of the market cycle.",
    proof: ["No easy hype frame", "Public accountability", "A community with patience"],
  },
  {
    id: "next",
    accent: "purple",
    year: "2026",
    tokenId: 10031,
    label: "Artifact 05",
    title: "The final votes",
    summary:
      "XIP 24 and XIP 25 turn the archive into action: move the artwork onchain, then wind down active DAO administration cleanly.",
    detail:
      "This is not a new mint. It is the approved path from dependency to durable storage, paired with rewards, grants, raffles, stewardship, and public final accounting.",
    proof: ["XIP 24 approved", "XIP 25 approved", "Verify first. Migrate second."],
  },
] as const;

export function StoryMuseum() {
  const [selectedId, setSelectedId] = useState<(typeof storyExhibits)[number]["id"]>("origin");
  const selected = storyExhibits.find((exhibit) => exhibit.id === selectedId) ?? storyExhibits[0];

  return (
    <section className="content-band story-museum" aria-labelledby="story-museum-title">
      <div className="story-museum-head">
        <div>
          <h2 id="story-museum-title">Walk the archive.</h2>
          <p>
            Each room holds a piece of the same argument: ExpansionPunks started
            as representation, became governance, survived the quiet years, and
            now moves toward a permanent onchain home.
          </p>
        </div>
        <Link className="text-link" href="/xips">
          View the current chapter
        </Link>
      </div>
      <div className="museum-layout">
        <div className="museum-rail" role="tablist" aria-label="Story artifacts">
          {storyExhibits.map((exhibit) => (
            <button
              aria-controls="selected-story-exhibit"
              aria-selected={selected.id === exhibit.id}
              className={selected.id === exhibit.id ? "selected" : ""}
              id={`story-tab-${exhibit.id}`}
              key={exhibit.id}
              role="tab"
              type="button"
              onClick={() => setSelectedId(exhibit.id)}
            >
              <span>{exhibit.label}</span>
              <strong>{exhibit.title}</strong>
              <small>{exhibit.year}</small>
            </button>
          ))}
        </div>
        <article
          aria-labelledby={`story-tab-${selected.id}`}
          className={`museum-exhibit ${selected.accent}`}
          id="selected-story-exhibit"
          role="tabpanel"
        >
          <div className="exhibit-art">
            <PunkImage tokenId={selected.tokenId} priority={selected.id === "origin"} />
            <div className="exhibit-shadow-grid" aria-hidden="true">
              {storyExhibits.slice(0, 4).map((exhibit) => (
                <PunkImage decorative key={exhibit.id} tokenId={exhibit.tokenId} />
              ))}
            </div>
          </div>
          <div className="exhibit-copy">
            <span>{selected.year}</span>
            <h3>{selected.title}</h3>
            <p>{selected.summary}</p>
            <p>{selected.detail}</p>
            <ul>
              {selected.proof.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}
