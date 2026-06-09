import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { VerifyReportSummary } from "@/components/verify/VerifyReportSummary";
import { VerifySearch } from "@/components/verify/VerifySearch";

export const metadata: Metadata = {
  title: "Verify",
  description:
    "Verify the onchain ExpansionPunks: we rebuilt all 10,000 from the contract and compared every pixel against the originals. Check any punk yourself.",
};

export default function MigrationVerifyPage() {
  return (
    <>
      <PageIntro
        tone="amber"
        accent="magenta"
        title="Every xPunk, reproduced onchain."
        lead="We read each punk straight from the onchain contract and compared it, pixel for pixel, against the original image the collection has always referenced. Here is how the full collection held up — and a tool to check any punk yourself."
      >
        <VerifySearch />
      </PageIntro>

      <VerifyReportSummary />
    </>
  );
}
