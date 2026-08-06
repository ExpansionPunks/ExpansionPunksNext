import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { GovernanceSection } from "@/components/xips/GovernanceSection";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "XIP 24 and XIP 25",
};

export default function XipsPage() {
  return (
    <>
      <PageIntro
        tone="amber"
        accent="magenta"
        title="Two votes. One path forward."
        lead="XIP 24 moves ExpansionPunks fully onchain. XIP 25 closes active DAO administration through rewards, grants, raffles and stewardship. This is the detailed execution record."
      >
        <ButtonLink href="/migration">Back to migration</ButtonLink>
      </PageIntro>
      <GovernanceSection />
    </>
  );
}
