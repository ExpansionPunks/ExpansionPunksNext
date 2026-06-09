import { redirect } from "next/navigation";

// Verification moved under the Migration pillar.
export default async function VerifyTokenRedirect({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  redirect(`/migration/verify/${tokenId}`);
}
