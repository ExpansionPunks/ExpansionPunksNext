import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PunkImage } from "@/components/ui/PunkImage";

const doorways = [
  {
    key: "why",
    accent: "plum",
    kicker: "Past",
    title: "Story",
    copy: "How a more representative expansion of the Punkverse became a DAO and chose a permanent onchain home.",
    tokenId: 10006,
    href: "/story",
    cta: "Read the story",
  },
  {
    key: "what",
    accent: "blue",
    kicker: "Present",
    title: "Collection",
    copy: "Ten thousand xPunks, #10000 to #19999, assembled from onchain parts. Inspect the art and its provenance.",
    tokenId: 12238,
    href: "/collection",
    cta: "Open the collection",
  },
  {
    key: "when",
    accent: "magenta",
    kicker: "Future",
    title: "Migration",
    copy: "Retire the legacy token, mint the same-numbered xPunk onchain, and follow the DAO wind-down.",
    tokenId: 18108,
    href: "/migration",
    cta: "See migration",
  },
] as const;

export function Doorways() {
  return (
    <section className="doorways section-wrap" aria-label="Where to go next">
      {doorways.map((d) => (
        <article className="doorway" data-accent={d.accent} key={d.key}>
          <span className="doorway-kicker">{d.kicker}</span>
          <h2>{d.title}</h2>
          <p>{d.copy}</p>
          <figure className="doorway-figure">
            <PunkImage tokenId={d.tokenId} decorative />
          </figure>
          <ButtonLink variant="primary" href={d.href}>
            {d.cta}
          </ButtonLink>
        </article>
      ))}
      <Link className="text-link doorway-skip" href="/migration#timeline">
        Or jump straight to where the project is now
      </Link>
    </section>
  );
}
