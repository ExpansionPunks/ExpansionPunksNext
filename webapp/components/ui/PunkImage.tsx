import Image from "next/image";
import { punkAsset } from "@/lib/site-data";

type PunkImageProps = {
  tokenId: number;
  className?: string;
  decorative?: boolean;
  priority?: boolean;
};

export function PunkImage({
  tokenId,
  className,
  decorative = false,
  priority = false,
}: PunkImageProps) {
  return (
    <Image
      className={className}
      src={punkAsset(tokenId)}
      width={504}
      height={504}
      quality={100}
      priority={priority}
      alt={decorative ? "" : `ExpansionPunk #${tokenId}`}
    />
  );
}
