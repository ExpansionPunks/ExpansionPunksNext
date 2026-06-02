import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { PunkReformPlayground } from "@/components/reform/PunkReformPlayground";

export const metadata: Metadata = {
  title: "Pixel Reform Lab",
};

export default function PixelReformLabPage() {
  return (
    <>
      <PageIntro
        tone="amber"
        title="Pixel reform lab."
        lead="A motion study for living xPunks and the onchain migration reveal."
      />
      <PunkReformPlayground />
    </>
  );
}
