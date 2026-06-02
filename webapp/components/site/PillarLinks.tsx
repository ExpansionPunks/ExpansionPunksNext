import { ButtonLink } from "@/components/ui/ButtonLink";

// The three pillars, in narrative order. Each page drops itself and links to
// the other two from the bottom of the page.
const pillars = [
  { href: "/story", cta: "Read the story" },
  { href: "/collection", cta: "Browse the collection" },
  { href: "/migration", cta: "See the migration" },
] as const;

export function PillarLinks({ current }: { current: (typeof pillars)[number]["href"] }) {
  const others = pillars.filter((pillar) => pillar.href !== current);

  return (
    <section className="content-band pillar-links">
      <p className="pillar-links-kicker">Two more ways in</p>
      <div className="pillar-links-actions">
        {others.map((pillar, index) => (
          <ButtonLink
            key={pillar.href}
            href={pillar.href}
            variant={index === 0 ? "primary" : "secondary"}
          >
            {pillar.cta}
          </ButtonLink>
        ))}
      </div>
    </section>
  );
}
