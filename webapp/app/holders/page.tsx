import { redirect } from "next/navigation";

// The holder app consolidated to /holder. Keep the old path working for
// any existing deep links.
export default function HoldersRedirect() {
  redirect("/holder");
}
