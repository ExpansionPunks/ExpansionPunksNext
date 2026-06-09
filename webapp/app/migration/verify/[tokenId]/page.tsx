import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/site/PageIntro";
import { PunkVerifier } from "@/components/verify/PunkVerifier";
import { VerifySearch } from "@/components/verify/VerifySearch";
import { isValidTokenId, verifyTarget } from "@/lib/verify-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}): Promise<Metadata> {
  const { tokenId } = await params;
  return {
    title: `Verify punk #${tokenId}`,
    description: `Compare the onchain render of Expansion Punk #${tokenId} against its original IPFS image.`,
  };
}

export default async function MigrationVerifyTokenPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const id = Number(tokenId);
  if (!isValidTokenId(id)) notFound();

  return (
    <>
      <PageIntro
        tone="amber"
        accent="magenta"
        title={`Verify punk #${id}`}
        lead={`Reading punk #${id} from the Renderer contract on ${verifyTarget.label} and comparing it against the original IPFS image, in your browser.`}
      >
        <VerifySearch initial={id} />
      </PageIntro>

      <PunkVerifier key={id} tokenId={id} />
    </>
  );
}
