import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PillarFigure, type PillarVariant } from "@/components/home/PillarFigure";

const doorways: ReadonlyArray<{
  key: string;
  accent: string;
  kicker: string;
  title: string;
  copy: string;
  variant: PillarVariant;
  tokenId: number;
  href: string;
  cta: string;
}> = [
  {
    key: "why",
    accent: "plum",
    kicker: "Past",
    title: "Story",
    copy: "How a more representative expansion of the Punkverse became a DAO and chose a permanent onchain home.",
    variant: "lineage",
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
    variant: "mosaic",
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
    variant: "onchain",
    tokenId: 18108,
    href: "/migration",
    cta: "See migration",
  },
];

export function Doorways() {
  return (
    <section className="doorways section-wrap" aria-label="Where to go next">
      {doorways.map((d) => (
        <article className="doorway" data-accent={d.accent} key={d.key}>
          <span className="doorway-kicker">{d.kicker}</span>
          <h2>{d.title}</h2>
          <p>{d.copy}</p>
          <figure className="doorway-figure">
            <PillarFigure variant={d.variant} tokenId={d.tokenId} />
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
