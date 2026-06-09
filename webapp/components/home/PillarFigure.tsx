import { PunkImage } from "@/components/ui/PunkImage";

// Per-pillar compositions, all built from the static /punks PNGs.
//   lineage — a small overlapping cluster (Story / origins / community)
//   mosaic  — a 4x4 tile of the collection (Collection / the 10k assembled)
//   onchain — one punk under a pixel grid (Migration / rebuilt onchain)
export type PillarVariant = "lineage" | "mosaic" | "onchain";

const lineagePunks = [10000, 10006, 10013, 11177];

const mosaicPunks = [
  10000, 10031, 10164, 10502, 10741, 11177, 11414, 11906,
  12238, 12694, 13239, 13580, 14068, 14606, 14857, 15522,
];

export function PillarFigure({
  variant,
  tokenId,
}: {
  variant: PillarVariant;
  tokenId: number;
}) {
  if (variant === "lineage") {
    return (
      <div className="pillar-figure pf-lineage" aria-hidden="true">
        {lineagePunks.map((id) => (
          <PunkImage key={id} tokenId={id} decorative />
        ))}
      </div>
    );
  }

  if (variant === "mosaic") {
    return (
      <div className="pillar-figure pf-mosaic" aria-hidden="true">
        {mosaicPunks.map((id) => (
          <PunkImage key={id} tokenId={id} decorative />
        ))}
      </div>
    );
  }

  return (
    <div className="pillar-figure pf-onchain" aria-hidden="true">
      <PunkImage tokenId={tokenId} decorative />
    </div>
  );
}
