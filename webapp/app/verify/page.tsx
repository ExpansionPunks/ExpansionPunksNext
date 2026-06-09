import { redirect } from "next/navigation";

// Verification moved under the Migration pillar.
export default function VerifyRedirect() {
  redirect("/migration/verify");
}
